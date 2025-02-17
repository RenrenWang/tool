const fs = require('fs'); 
const glob = require('fast-glob');
const MagicString = require('magic-string');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const babelUtils =require('./babel/utils')
const addToFunction =require('./babel/add-to-function')
const generate = require('@babel/generator').default;

function processFile(file){
  const code = fs.readFileSync(file, 'utf-8');

  const s = new MagicString(code);
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy'],
    attachComment: true
  });

      // 第一阶段：收集修改
      traverse(ast, {
        // StringLiteral: path => console.log("StringLiteral",path.node),
        // TemplateLiteral: path => console.log("TemplateLiteral",path.node),
       JSXText: path => { 
        if(/[\u4e00-\u9fa5]/.test(path.node.value.trim())){
          const newValue = `{t('${path.node.value.trim()}')}`;
          s.overwrite(path.node.start, path.node.end, newValue);
        }
       },
        JSXAttribute: path => {
          const attributeName = path.node.name.name; // 如 "value", "label" 等
          const attributeValue = path.node.value;
          
          if(t.isStringLiteral(attributeValue) && /[\u4e00-\u9fa5]/.test(attributeValue.value)){
            const outerFunctionPath = babelUtils.findOuterFunction(path);

            if (outerFunctionPath) {
              addToFunction(outerFunctionPath)
              console.log(
                `变量 "${attributeName}=${attributeValue.value}" 位于函数: ${babelUtils.getFunctionName(outerFunctionPath)}`
              );
            }  
            
            const newValue = t.jsxExpressionContainer(
              t.callExpression(
                t.identifier("t"),
                [t.stringLiteral(attributeValue.value.toString())]
              )
            );
             console.log("==>",newValue,attributeValue.value)
            // 2. 替换原属性值
            path.get("value").replaceWith(newValue);
           // s.overwrite(path.node.start, path.node.end, `${path.node.name.name}=${newValue}`);
          }
        },

      });
    const { code:nm } = generate(ast, {
      retainLines: true,  // 保留原始行号
      compact: false,     // 不压缩代码
      comments: true      // 保留注释
    });
     fs.writeFileSync('./test.tsx', nm);
      // fs.writeFileSync('./test.tsx', s.toString());
}

async function main() {
  try {
    const files = await glob(['src/**/*.{ts,tsx}', '!**/*.d.ts']);
    for (const file of files) {
      await processFile(file); // 顺序处理，确保稳定性
    }
    console.log('转换完成！共处理文件：', files.length);
  } catch (err) {
    console.error('主流程执行失败：', err);
    process.exit(1);
  }
}

main();