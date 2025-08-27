const fs = require('fs');
const { parse } = require('node-html-parser');

// 单行压缩专用配置
const aggressiveOptions = {
  collapseWhitespace: true,    // 完全折叠空白
  removeComments: true,        // 移除所有注释
  minifyCSS: false,            // 可选CSS压缩
  minifyJS: false,             // 可选JS压缩
  preserveLineBreaks: false,   // 不保留换行
  removeAttributeQuotes: true, // 移除属性引号
  collapseBooleanAttributes: true // 压缩布尔属性
};

function crushToSingleLine(html) {
  // 1. 使用DOM解析器处理
  const root = parse(html, {
    comment: false, // 完全忽略注释
    voidTag: { tags: ['br','img','input'] } // 自闭合标签处理
  });

  // 2. 递归处理节点
  function processNode(node) {
    if (node.nodeType === 1) { // 元素节点
      // 处理属性
      if (node.attributes) {
        Object.entries(node.attributes).forEach(([name, value]) => {
          // 移除空值和布尔属性处理
          if (value === '' || value === name) {
            node.setAttribute(name, null);
          }
          // 移除引号（安全方式）
          else if (/^[a-zA-Z0-9-_]+$/.test(value)) {
            node.setAttribute(name, value.replace(/['"]/g, ''));
          }
        });
      }
      // 处理子节点
      node.childNodes.forEach(processNode);
    }
    else if (node.nodeType === 3) { // 文本节点
      const parentTag = node.parentNode.tagName?.toLowerCase();
      // 跳过pre、textarea等特殊标签
      if (!['pre', 'textarea', 'script', 'style'].includes(parentTag)) {
        node.text = node.text
          .replace(/\s+/g, ' ')      // 合并连续空白
          .replace(/[\r\n]/g, '')    // 移除换行符
          .trim()                    // 去除首尾空格
          .replace(/>\s+</g, '><');  // 移除标签间空格
      }
    }
  }

  processNode(root);

  // 3. 最终处理
  return root.toString()
    .replace(/\n/g, '')              // 全局移除换行
    .replace(/\s+/g, ' ')            // 全局合并空格
    .replace(/>\s+</g, '><')         // 确保标签间无空格
    .trim();                         // 去除首尾空格
}

const fileList=[
  '/Users/wrr/Desktop/@wr/website/src/email-tpl/home.html',
]
fileList.forEach(file=>{
  const inputHtml = fs.readFileSync(file, 'utf-8');
  const compressed = crushToSingleLine(inputHtml);
  //文件名改成压缩后的
  fs.writeFileSync(file.replace('.html','-compressed.html'),compressed, 'utf-8');
})

module.exports.crushToSingleLine=crushToSingleLine
