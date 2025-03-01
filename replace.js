const fs = require('fs/promises');
const path = require('path');
const fg = require('fast-glob');
const { parse } = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const { default: generate } = require('@babel/generator');
const chalk = require('chalk').default;
const json5 = require('json5');
const recast = require('recast');
const t = require('@babel/types');
const pLimit = require('p-limit').default;

// 内存优化配置
const MEM_CONFIG = {
  MAX_FILE_SIZE: 1 * 1024 * 1024,   // 1MB
  BATCH_SIZE: 10,                    // 串行处理
  GC_INTERVAL: 50,                  // 每处理50个文件GC一次
  NODE_MEM_LIMIT: '4096'            // 默认内存限制4GB
};

// 替换器核心类
class MemorySafeCodeReplacer {
  // 类属性初始化（ES2022）
  stats = {
    processed: 0,
    modified: 0,
    replacements: 0,
    skipped: 0,
    errors: []
  };
  usedKeys = new Set();
  unusedReplacements = [];
  config = {
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts'
    ],
    replacements: {}
  };

  constructor() {
    // 移除冗余的初始化代码
  }

  async initialize() {
    await this.loadConfig();
    this.printEnvInfo();
  }

  async loadConfig() {
    try {
      const configFile = await fs.readFile('.replacerc.json', 'utf8');
      const userConfig = json5.parse(configFile);
      // 深度合并配置（保留默认值）
      this.config = {
        ...this.config,
        ...userConfig,
        extensions: userConfig.extensions || this.config.extensions,
        ignore: [...new Set([...this.config.ignore, ...(userConfig.ignore || [])])]
      };
    } catch (error) {
      console.log(chalk.yellow('⚠ 使用默认配置（未找到配置文件）'));
    }
  }

  // 优化后的 AST 遍历方法
  traverseAST(ast, replacements) {
    const handler = {
      VariableDeclarator: this.handleVariableDeclarator.bind(this),
      CallExpression: this.handleCallExpression.bind(this, replacements),
      JSXAttribute: this.handleJSXAttribute.bind(this, replacements),
      ObjectProperty: this.handleObjectProperty.bind(this, replacements)
    };
    
    traverse(ast, handler);
  }
// 新增对象属性处理方法
  handleObjectProperty(replacements, path) {
    const { node } = path;
    if (
      (node.key.type === 'Identifier' && node.key.name === 'access') ||
      (node.key.type === 'StringLiteral' && node.key.value === 'access')
    ) {
      const oldValue = node.value.value;
      const newValue = this.config.replacements[oldValue];
      
      if (newValue) {
        path.get('value').replaceWith(t.stringLiteral(newValue));
        this.usedKeys.add(oldValue);
        replacements.push({ oldValue, newValue });
        path.skip();
      }
    }
  }
  // 独立处理方法
  handleVariableDeclarator(path) {
    const { node } = path;
    if (
      node.init?.type === "CallExpression" &&
      node.init.callee.name === "useAccess" &&
      node.id.type === "ObjectPattern"
    ) {
      node.id.properties.forEach((prop) => {
        if (prop.key.name === "check") {
          const binding = path.scope.getBinding(prop.value.name);
          if (binding) binding.isTargetCheck = true;
        }
      });
    }
  }

  handleCallExpression(replacements, path) {
    const { node } = path;
    if (node.callee.type === "Identifier") {
      const binding = path.scope.getBinding(node.callee.name);
      if (binding?.isTargetCheck) {
        this.applyReplacement(path, replacements);
      }
    }
  }

  handleJSXAttribute(replacements, path) {
    if (this.shouldSkip(path)) return;
    if (path.node.name.name === 'data-access' || path.node.name.name === 'access') {
      this.replaceString(path, replacements);
    }
  }

  // 统一替换逻辑
  applyReplacement(path, replacements) {
    const oldValue = path.node.arguments[0]?.value;
    const newValue = this.config.replacements[oldValue];
    
    if (newValue) {
      this.usedKeys.add(oldValue); // 记录已使用的 key
      const firstArgPath = path.get('arguments.0');
      firstArgPath?.replaceWith(t.stringLiteral(newValue));
      path.skip();  // 统一添加 skip
      replacements.push({ oldValue, newValue });
    }
  }

  // 优化错误处理
  handleError(filePath, error) {
    this.stats.errors.push({ filePath, error });
    console.error(chalk.red(`\n❌ 处理失败 ${path.basename(filePath)}`));
    console.error(chalk.gray(`错误类型: ${error.name}`));
    console.error(chalk.gray(`错误详情: ${error.message}`));
  }

  printEnvInfo() {
    console.log(chalk.green('ℹ 环境信息:'));
    console.log(`内存限制: ${chalk.cyan(MEM_CONFIG.NODE_MEM_LIMIT + 'MB')}`);
    console.log(`最大文件: ${chalk.cyan(MEM_CONFIG.MAX_FILE_SIZE + ' bytes')}`);
    console.log(`并发模式: ${chalk.cyan(MEM_CONFIG.BATCH_SIZE === 1 ? '串行' : '并行')}`);
  }

  async processFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // 大文件跳过
      if (stats.size > MEM_CONFIG.MAX_FILE_SIZE) {
        this.stats.skipped++;
        console.log(chalk.yellow(`⏩ 跳过 ${path.basename(filePath)} (${stats.size} bytes)`));
        return;
      }

      // 读取并处理
      const content = await fs.readFile(filePath, 'utf8');
      const ast = this.parseToAST(content, filePath);
 
      const replacements = [];
      
      this.traverseAST(ast, replacements);
      
      if (replacements.length === 0) return;

      // 生成新代码
      const newCode = this.generateCode(ast,filePath);
      await this.writeFile(filePath, content, newCode);
      
      // 更新统计
      this.stats.modified++;
      this.stats.replacements += replacements.length;
      this.logReplacements(filePath, replacements);

    } catch (error) {
      this.handleError(filePath, error);
    } finally {
      this.manageMemory();
    }
  }

  parseToAST(content, filePath) {
    try {
      const self=this
      return recast.parse(content, {
        parser: {
          parse(source) {
            return require('@babel/parser').parse(source, {
              sourceType: 'module',
              plugins: self.getParserPlugins(filePath),
              tokens: true
            });
          }
        }
      });
    } catch (error) {
      throw new Error(`解析AST失败: ${error.message}`);
    }
  }

  getParserPlugins(filePath) {
    const ext = path.extname(filePath);
    const basePlugins = ['jsx', 'classProperties'];
    return ext === '.ts' || ext === '.tsx' 
      ? [...basePlugins, 'typescript'] 
      : basePlugins;
  }

  shouldSkip(path) {
    return !!path.findParent(p => 
      p.isTSType() || 
      p.isFlowType() ||
      p.isTypeParameterDeclaration()
    );
  }

  replaceString(path, replacements) {
    const oldValue = path.node.value.value;
    const newValue = this.config.replacements[oldValue];
    
    if (newValue) {
      this.usedKeys.add(oldValue); // 记录已使用的 key
      path.node.value.value = newValue;
      replacements.push({ oldValue, newValue });
    }
  }

  replaceTemplate(path, replacements) {
    const value = path.node.value;
    const newValue = this.config.replacements[value.raw];
    
    if (newValue) {
      value.raw = newValue;
      value.cooked = newValue;
      replacements.push({ oldValue: value.raw, newValue });
    }
  }

  generateCode(ast,filePath) {
    try {
 
      return recast.print(ast).code
    } catch (error) {
      throw new Error(`生成代码失败: ${error.message}:${filePath}`);
    }
  }

  async writeFile(filePath, original, newCode) {
    if (process.argv.includes('--dry-run')) {
      this.showDiff(filePath, original, newCode);
      return;
    }

    await this.createBackup(filePath);
    await fs.writeFile(filePath, newCode);
  }

  async createBackup(filePath) {
    if (process.argv.includes('--no-backup')) return;

    const backupDir = path.join(path.dirname(filePath), '.codereplace_backup');
    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)));
  }

  logReplacements(filePath, replacements) {
    if (!process.argv.includes('--verbose')) return;

    // 收集替换记录到统计信息
    this.stats.reportData = this.stats.reportData || [];
    replacements.forEach(({ oldValue, newValue }) => {
      this.stats.reportData.push({
        file: path.relative(process.cwd(), filePath),
        oldValue,
        newValue
      });
    });

    // 控制台输出保持不变
    console.log(chalk.cyan(`\n📝 修改记录 ${filePath}:`));
    replacements.forEach(({ oldValue, newValue }) => {
      console.log(`${chalk.red(oldValue)} → ${chalk.green(newValue)}`);
    });
  }

  // 在 printFinalReport 方法前添加新方法
  async generateHtmlReport() {
    if (!this.stats.reportData?.length) return;
    this.unusedReplacements = Object.entries(this.config.replacements)
    .filter(([key]) => !this.usedKeys.has(key))
    .map(([key, value]) => ({ oldValue: key, newValue: value }));

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>代码替换报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 2rem; }
    .report-title { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f8f9fa; text-align: left; padding: 1rem; border-bottom: 2px solid #eee; }
    td { padding: 1rem; border-bottom: 1px solid #eee; vertical-align: top; }
    .old-value { color: #e74c3c; font-family: Menlo, Monaco, Consolas, monospace; }
    .new-value { color: #2ecc71; font-family: Menlo, Monaco, Consolas, monospace; }
    tr:hover { background: #f8f9fa; }
     /* 新增未使用项样式 */
    .unused-section { margin-top: 3rem; border-top: 2px solid #eee; padding-top: 2rem; }
    .unused-row { opacity: 0.6; background-color: #f9f9f9; }
    .unused-row:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1 class="report-title">代码替换报告 - ${new Date().toLocaleString()}</h1>
  <table>
    <thead>
      <tr>
        <th>编号</th>
        <th>文件路径</th>
        <th>原始值</th>
        <th>替换值</th>
      </tr>
    </thead>
    <tbody>
      ${this.stats.reportData.map((item,index) => `
        <tr>
          <td>${index+1}</td>
          <td>${item.file}</td>
          <td><code class="old-value">${item.oldValue}</code></td>
          <td><code class="new-value">${item.newValue}</code></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
   <p>共 ${this.stats.reportData.length} 处替换，${this.stats.modified} 个文件被修改</p>
   ${this.unusedReplacements.length > 0 ? `
  <div class="unused-section">
    <h2 class="report-title">未使用的替换项 (${this.unusedReplacements.length})</h2>
    <table>
      <thead>
        <tr>
          <th>原始值</th>
          <th>配置的替换值</th>
        </tr>
      </thead>
      <tbody>
        ${this.unusedReplacements.map(item => `
          <tr class="unused-row">
            <td><code class="old-value">${item.oldValue}</code></td>
            <td><code class="new-value">${item.newValue}</code></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
 
</body>
</html>
    `;

    const reportPath = path.join(process.cwd(), `replace-report.html`);
    await fs.writeFile(reportPath, htmlContent);
    console.log(chalk.green(`\n📊 HTML 报告已生成: file://${reportPath}`));
  }

  // 修改 printFinalReport 方法
  async printFinalReport() {
    console.log(chalk.green('\n✅ 任务完成'));
    console.log(chalk.yellow('📊 执行报告:'));
    console.log(`总文件数: ${this.stats.total}`);
    console.log(`成功处理: ${this.stats.processed}`);
    console.log(`修改文件: ${chalk.cyan(this.stats.modified)}`);
    console.log(`替换次数: ${chalk.cyan(this.stats.replacements)}`);
    console.log(`跳过文件: ${chalk.yellow(this.stats.skipped)}`);
    console.log(`错误数量: ${chalk.red(this.stats.errors.length)}`);

    // 生成 HTML 报告
    await this.generateHtmlReport();

    if (this.stats.errors.length > 0) {
      console.log(chalk.red('\n❌ 错误详情:'));
      this.stats.errors.forEach(({ filePath }) => 
        console.log(`====>${path.basename(filePath)}`));
    }
  }

  showDiff(filePath, original, newCode) {
    console.log(chalk.yellow(`\n🔍 差异对比 ${filePath}:`));
    original.split('\n').slice(0, 3).forEach(line => 
      console.log(chalk.red(`- ${line.substring(0, 80)}`)));
    newCode.split('\n').slice(0, 3).forEach(line => 
      console.log(chalk.green(`+ ${line.substring(0, 80)}`)));
  }

  handleError(filePath, error) {
    this.stats.errors.push({ filePath, error });
   console.error(chalk.red(`\n❌ 处理失败 ${path.basename(filePath)}:`));
    console.error(chalk.gray(error.stack));
  }

  manageMemory() {
    this.stats.processed++;
    
    // 定期GC和内存报告
    if (this.stats.processed % MEM_CONFIG.GC_INTERVAL === 0) {
      this.printMemoryUsage();
      if (global.gc) {
        global.gc();
        console.log(chalk.magenta('🔄 手动垃圾回收'));
      }
    }
  }

  printMemoryUsage() {
    const usage = process.memoryUsage();
    console.log(chalk.blue('\n📊 内存使用:'));
    console.log(`堆总量: ${this.formatBytes(usage.heapTotal)}`);
    console.log(`已用堆: ${this.formatBytes(usage.heapUsed)}`);
    console.log(`RSS: ${this.formatBytes(usage.rss)}`);
  }

  formatBytes(bytes) {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  async run(targetDir) {
    
    console.log(chalk.yellow('🚀 启动代码替换...'));
    await this.initialize();

    try {
      const files = await this.findFiles(targetDir);
      this.stats.total = files.length;
      // 实现真正的并发控制
      const batchSize = MEM_CONFIG.BATCH_SIZE;// 使用 p-limit 控制并发
      const limit = pLimit(batchSize);
      
    
      console.log(`并发模式: ${chalk.cyan(batchSize > 1 ? `并行 (批量大小 ${batchSize})` : '串行')}`);

      // for (let i = 0; i < files.length; i += batchSize) {
      //   const batch = files.slice(i, i + batchSize);
      //   await Promise.all(batch.map(file => this.processFile(file.path)));
      // }
      await Promise.all(files.map(file => 
        limit(() => this.processFile(file.path))
      ));

      this.printFinalReport();
    } catch (error) {
      console.error(chalk.red('🔥 致命错误:'), error);
      process.exit(1);
    }
  }

  async findFiles(targetDir) {
    try {
      return await fg(this.config.extensions.map((item=>`**/*${item}`)), {
        ignore:this.config.ignore,
        cwd: targetDir,
        absolute: true,
        stats: true,
        dot: true

      });
    } catch (error) {
      throw new Error(`文件搜索失败: ${error.message}`);
    }
  }

}

// 优化 CLI 入口
(async () => {
  const replacer = new MemorySafeCodeReplacer();
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  
  try {
    await replacer.run(targetDir);
  } catch (error) {
    console.error(chalk.red('程序终止:'), error.message);
    process.exit(1);
  }
})();