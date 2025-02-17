const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const generator = require('@babel/generator').default;
const MagicString = require('magic-string');
const glob = require('fast-glob');
const crc32 = require('crc-32');
const { v4: uuidv4 } = require('uuid');
const prettier = require('prettier');

// ================== 增强配置项 ==================
const config = {
  idGenerator: (text) => `${uuidv4()}_${Math.abs(crc32.str(text))}`,
  preserveWhitespace: false,
  handleJSXText: true,
  autoImport: true,
  prettierConfig: {
    parser: 'typescript',
    singleQuote: true,
    trailingComma: 'all'
  }
};

// ================== 安全增强型转换器 ==================
class SafeIntlTransformer {
  constructor(magicString, ast) {
    this.s = magicString;
    this.ast = ast;
    this.imports = new Set();
    this.modifications = [];
    this.processedNodes = new WeakSet();
  }

  // ================ 核心处理方法 ================
  processStringLiteral(path) {
    if (!Utils.isChinese(path.node.value)) return;
    if (this.isInIgnoredPosition(path)) return;

    const component = this.findParentComponent(path);
    const replacement = component
      ? this.createFormatMessage(path.node.value)
      : this.createFormattedMessage(path.node.value);
    
    this.recordModification(path.start, path.end, replacement);
  }

  processTemplateLiteral(path) {
    const { quasis, expressions } = path.node;
    const hasChinese = quasis.some(q => Utils.isChinese(q.value.raw));
    if (!hasChinese) return;

    const component = this.findParentComponent(path);
    const { message, values } = this.parseTemplate(quasis, expressions);
    
    const replacement = component
      ? this.createFormatMessage(message, values)
      : this.createFormattedMessage(message, values);

    this.recordModification(path.start, path.end, replacement);
  }

  processJSXText(path) {
    if (!config.handleJSXText) return;
    
    const value = config.preserveWhitespace 
      ? path.node.value 
      : path.node.value.trim();
      
    if (!Utils.isChinese(value)) return;
    if (this.isInIgnoredPosition(path)) return;

    const component = this.findParentComponent(path);
    const replacement = component
      ? `{${this.createFormatMessage(value)}}`
      : this.createFormattedMessage(value);

    this.recordModification(path.start, path.end, replacement);
  }

  processJSXAttribute(path) {
    const value = path.get('value');
    if (!value.isStringLiteral()) return;
    
    if (Utils.isChinese(value.node.value)) {
      const component = this.findParentComponent(path);
      const replacement = component
        ? `{${this.createFormatMessage(value.node.value)}}`
        : `{${this.createFormattedMessage(value.node.value)}}`;
      
      this.recordModification(value.start, value.end, replacement);
    }
  }

  // ================ 安全修改记录 ================
  recordModification(start, end, content) {
    this.modifications.push({ start, end, content });
  }

  applyModifications() {
    // 按倒序处理避免位置偏移
    this.modifications
      .sort((a, b) => b.start - a.start)
      .forEach(({ start, end, content }) => {
        try {
            console.log(start, end, content)
          this.s.overwrite(start, end, content);
        } catch (err) {
          console.error('修改应用失败:', err.message);
        }
      });
  }

  // ================ 其他辅助方法 ================
  createFormatMessage(text, values = {}) {
    this.imports.add('useIntl');
    const id = Utils.generateId(text);
    const escaped = Utils.escapeMessage(text);
    
    return values && Object.keys(values).length > 0
      ? `intl.formatMessage({ id: '${id}', defaultMessage: '${escaped}' }, ${this.formatValues(values)})`
      : `intl.formatMessage({ id: '${id}', defaultMessage: '${escaped}' })`;
  }

  createFormattedMessage(text, values = {}) {
    this.imports.add('FormattedMessage');
    const id = Utils.generateId(text);
    const escaped = Utils.escapeMessage(text);
    
    const valuesAttr = Object.keys(values).length > 0
      ? ` values={${this.formatValues(values)}}`
      : '';
    
    return `<FormattedMessage id="${id}" defaultMessage="${escaped}"${valuesAttr} />`;
  }

  
  formatValues(values) {
      return JSON.stringify(values).replace(/"([^"]+)":/g, '$1:');
    }
  
    parseTemplate(quasis, expressions) {
      const messageParts = [];
      const values = {};
      
      quasis.forEach((q, i) => {
        messageParts.push(q.value.raw);
        if (expressions[i]) {
          const varName = Utils.extractVarName(expressions[i]);
          values[varName] = generator(expressions[i]).code;
          messageParts.push(`{${varName}}`);
        }
      });
  
      return {
        message: messageParts.join(''),
        values
      };
    }
  
    isInIgnoredPosition(path) {
      const node = path.node;
      return !!(
        (node.leadingComments?.length > 0) ||
        (node.trailingComments?.length > 0)
      );
    }
  
    findParentComponent(path) {
      return path.findParent(p => {
        if (t.isFunctionDeclaration(p) || 
            t.isArrowFunctionExpression(p) ||
            t.isFunctionExpression(p)) {
          let isComponent = false;
          p.traverse({
            JSXElement() { isComponent = true; },
            CallExpression(ce) {
              if (t.isIdentifier(ce.node.callee) && 
                  ce.node.callee.name.startsWith('use')) {
                isComponent = true;
              }
            }
          });
          return isComponent;
        }
        return false;
      });
    }
  
    updateAST() {
      try {
        const newCode = this.s.toString();
        this.ast = parser.parse(newCode, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy'],
          attachComment: true
        });
      } catch (err) {
        console.error('AST 更新失败：', err);
      }
    }
  
    processNode(path) {
      if (this.processedNodes.has(path.node)) return;
      
      try {
        if (t.isStringLiteral(path.node)) {
          this.processStringLiteral(path);
          path.skip();
        } else if (t.isTemplateLiteral(path.node)) {
          this.processTemplateLiteral(path);
          path.skip();
        } else if (t.isJSXText(path.node)) {
          this.processJSXText(path);
          path.skip();
        } else if (t.isJSXAttribute(path.node)) {
          this.processJSXAttribute(path);
          path.skip();
        }
        
        this.processedNodes.add(path.node);
      } catch (err) {
        console.error(`处理节点时出错 [${path.type}]：`, err);
        path.skip();
      }
    }
  
    processJSXText(path) {
      if (!config.handleJSXText) return;
      
      const value = config.preserveWhitespace 
        ? path.node.value 
        : path.node.value.trim();
        
      if (!Utils.isChinese(value)) return;
      if (this.isInIgnoredPosition(path)) return;
  
      const component = this.findParentComponent(path);
      const replacement = component
        ? `{${this.createFormatMessage(value)}}`
        : this.createFormattedMessage(value);
  
      this.s.overwrite(path.start, path.end, replacement);
    }
}

// ================== 工具类优化 ==================
class Utils {
  static isChinese(text) {
    return /[\p{Script=Han}]/u.test(text);
  }

  static generateId(text) {
    return config.idGenerator(text.replace(/[{}]/g, ''));
  }

  static escapeMessage(text) {
    return text
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\\/g, '\\\\');
  }

  static extractVarName(expr) {
    const code = generator(expr).code;
    const matches = code.match(/(\w+)(?:\.\w+)*/);
    return matches ? matches[1] : 'value';
  }
}

// ================== 稳健的主处理流程 ==================
async function processFile(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');
    const s = new MagicString(code);
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      attachComment: true
    });

    const transformer = new SafeIntlTransformer(s, ast);

    // 第一阶段：收集修改
    traverse(ast, {
      StringLiteral: path => transformer.processStringLiteral(path),
      TemplateLiteral: path => transformer.processTemplateLiteral(path),
      JSXText: path => transformer.processJSXText(path),
      JSXAttribute: path => transformer.processJSXAttribute(path)
    });

    // 应用所有修改
    transformer.applyModifications();

    // 第二阶段：处理声明和导入
    const newCode = transformer.s.toString();
    const updatedAst = parser.parse(newCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      attachComment: true
    });

    traverse(updatedAst, {
      FunctionDeclaration(path) {
        if (!path.scope.getBinding('intl')) {
          const body = path.get('body');
          if (body.isBlockStatement()) {
            const newCode = 'const intl = useIntl();\n';
            body.node.body.unshift(parser.parse(newCode).program.body[0]);
          }
        }
      },
      ImportDeclaration(path) {
        if (path.node.source.value === 'react-intl') {
          const needed = ['useIntl', 'FormattedMessage'].filter(x => 
            !path.node.specifiers.some(s => s.imported.name === x)
          );
          if (needed.length > 0) {
            path.node.specifiers.push(...needed.map(name => 
              t.importSpecifier(t.identifier(name), t.identifier(name))
            ));
          }
        }
      }
    });

    // 生成最终代码
    const finalCode = generator(updatedAst).code;
    const formatted = await prettier.format(finalCode, config.prettierConfig);
    
    await fs.writeFile(filePath, formatted);
    console.log(`成功处理：${filePath}`);
  } catch (err) {
    console.error(`文件处理失败 [${filePath}]：`, err);
  }
}

// ================== 执行入口 ==================
async function main() {
  try {
    const files = await glob(['src/**/*.{ts,tsx}', '!**/*.d.ts']);
    for (const file of files) {
      await processFile(file); // 改为顺序处理确保稳定性
    }
    console.log('转换完成！共处理文件：', files.length);
  } catch (err) {
    console.error('主流程执行失败：', err);
    process.exit(1);
  }
}

main();