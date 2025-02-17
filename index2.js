const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const generator = require('@babel/generator').default;
const MagicString = require('magic-string');
const glob = require('fast-glob');

// 判断是否是函数组件
function isReactFunctionComponent(path) {
  let isComponent = false;
  
  // 检查是否返回JSX
  path.traverse({
    ReturnStatement(returnPath) {
      if (t.isJSXElement(returnPath.node.argument)) {
        isComponent = true;
        returnPath.stop();
      }
    }
  });

  // 检查是否使用hooks
  path.traverse({
    CallExpression(callPath) {
      if (t.isIdentifier(callPath.node.callee) && 
          callPath.node.callee.name.startsWith('use')) {
        isComponent = true;
        callPath.stop();
      }
    }
  });

  return isComponent;
}

async function processFile(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');
    const s = new MagicString(code);
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    let shouldImportUseIntl = false;
    let shouldImportFormatted = false;
    let intlDeclared = new Set(); // 跟踪每个作用域的声明

    // 第一次遍历：识别所有函数组件
    const functionComponents = new Set();
    traverse(ast, {
      FunctionDeclaration(path) {
        if (isReactFunctionComponent(path)) {
          functionComponents.add(path);
        }
      },
      ArrowFunctionExpression(path) {
        if (path.parentPath.isVariableDeclarator() && 
            isReactFunctionComponent(path)) {
          functionComponents.add(path);
        }
      }
    });

    // 第二次遍历：处理替换
    traverse(ast, {
      // 处理JSX属性中的字符串
      JSXAttribute(path) {
        if (t.isStringLiteral(path.node.value) && 
            /[\u4e00-\u9fa5]/.test(path.node.value.value)) {
          
          const closestFunction = path.findParent(p => 
            p.isFunctionDeclaration() || 
            p.isArrowFunctionExpression()
          );

          const isInFunctionComponent = closestFunction && 
            functionComponents.has(closestFunction);

          if (isInFunctionComponent) {
            // 函数组件内使用 useIntl().formatMessage
            shouldImportUseIntl = true;
            
            // 在最近的函数组件顶部添加intl声明
            if (!intlDeclared.has(closestFunction)) {
              const body = closestFunction.get('body');
              if (body.isBlockStatement()) {
                s.appendLeft(body.node.body[0].start, 
                  'const intl = useIntl();\n');
                intlDeclared.add(closestFunction);
              }
            }

            const newValue = `{intl.formatMessage({ id: '${path.node.value.value}' })}`;
            s.overwrite(
              path.node.value.start,
              path.node.value.end,
              newValue
            );
          } else {
            // 非函数组件使用 FormattedMessage
            shouldImportFormatted = true;
            const newValue = `{<FormattedMessage id="${path.node.value.value}" />}`;
            s.overwrite(
              path.node.value.start,
              path.node.value.end,
              newValue
            );
          }
        }
      }
    });

    // 处理导入语句
    if (shouldImportUseIntl || shouldImportFormatted) {
      const imports = [];
      if (shouldImportUseIntl) imports.push('useIntl');
      if (shouldImportFormatted) imports.push('FormattedMessage');
      
      const importStatement = `import { ${imports.join(', ')} } from 'react-intl';\n`;
      
      // 查找第一个非导入节点
      let insertPos = 0;
      ast.program.body.some((node, index) => {
        if (!t.isImportDeclaration(node)) {
          insertPos = node.start;
          return true;
        }
      });
      
      s.prependLeft(insertPos, importStatement);
    }

    // 写入修改
    const newCode = s.toString();
    if (newCode !== code) {
      await fs.writeFile(filePath, newCode);
      console.log(`Updated: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

// 主函数保持不变
async function main() {
  const files = await glob(['src/**/*.{ts,tsx}']);
  for (const file of files) {
    await processFile(file);
  }
}

main().catch(console.error);