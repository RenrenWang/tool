const fs = require("fs");
const { parse } = require("node-html-parser");
const http = require("http");

// 单行压缩专用配置
const aggressiveOptions = {
  collapseWhitespace: true, // 完全折叠空白
  removeComments: true, // 移除所有注释
  minifyCSS: false, // 可选CSS压缩
  minifyJS: false, // 可选JS压缩
  preserveLineBreaks: false, // 不保留换行
  removeAttributeQuotes: true, // 移除属性引号
  collapseBooleanAttributes: true, // 压缩布尔属性
};

function crushToSingleLine(html) {
  // 1. 使用DOM解析器处理
  const root = parse(html, {
    comment: false, // 完全忽略注释
    voidTag: { tags: ["br", "img", "input"] }, // 自闭合标签处理
  });

  // 2. 递归处理节点
  function processNode(node) {
    if (node.nodeType === 1) {
      // 元素节点
      // 处理属性
      if (node.attributes) {
        Object.entries(node.attributes).forEach(([name, value]) => {
          // 移除空值和布尔属性处理
          if (value === "" || value === name) {
            node.setAttribute(name, null);
          }
          // 移除引号（安全方式）
          else if (/^[a-zA-Z0-9-_]+$/.test(value)) {
            node.setAttribute(name, value.replace(/['"]/g, ""));
          }
        });
      }
      // 处理子节点
      node.childNodes.forEach(processNode);
    } else if (node.nodeType === 3) {
      // 文本节点
      const parentTag = node.parentNode.tagName?.toLowerCase();
      // 跳过pre、textarea等特殊标签
      if (!["pre", "textarea", "script", "style"].includes(parentTag)) {
        node.text = node.text
          .replace(/\s+/g, " ") // 合并连续空白
          .replace(/[\r\n]/g, "") // 移除换行符
          .trim() // 去除首尾空格
          .replace(/>\s+</g, "><"); // 移除标签间空格
      }
    }
  }

  processNode(root);

  // 3. 最终处理
  return root
    .toString()
    .replace(/\n/g, "") // 全局移除换行
    .replace(/\s+/g, " ") // 全局合并空格
    .replace(/>\s+</g, "><") // 确保标签间无空格
    .trim(); // 去除首尾空格
}

// 使用示例

const inputHtml = fs.readFileSync("./PaymentConfirmation.html", "utf-8");
const compressed = crushToSingleLine(inputHtml);
fs.writeFileSync('output.html', compressed);

// 请求体数据
const postData = JSON.stringify({
  fileName: "test.pdf",
  content: compressed,
  width: 1080,
  height: 1528,
});

console.log(postData)

// 构建POST请求选项
const requestOptions = {
  hostname: "ebfs-base-service.ebfs.svc.ebonex-newdev",
  port: 8080,
  path: "/base-service/file/internal/pdf-create",
  method: "POST",
  headers: {
    // utf-8编码
    "Content-Type": "application/json; charset=utf-8",
  
    "Content-Length": Buffer.byteLength(postData), // 显式设置Content-Length
  },
  timeout: 5000,
};

// 发送POST请求
const req = http.request(requestOptions, (res) => {
  if (res.statusCode !== 200) {
    console.error(`请求失败: ${res.statusCode} ${res.statusMessage}`);
    return;
  }

  // 创建一个可写流来保存文件
  const fileStream = fs.createWriteStream("test.pdf");

  // 将响应数据写入文件流
  res.pipe(fileStream);

  // 监听文件写入完成事件
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('文件已成功保存为 test.pdf');
  });

  // 监听文件写入错误事件
  fileStream.on('error', (err) => {
    console.error('文件写入错误:', err);
  });
});

req.on('error', (e) => {
  console.error(`请求出错: ${e.message}`);
});

req.on('error', (e) => {
  console.error(`请求出错: ${e.message}`);
});

// 写入数据到请求主体
req.write(postData);

// 结束请求
req.end();




const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

  setTimeout(async () => {
      await page.goto('file:///Users/wrr/Desktop/i18n-tool/PaymentConfirmation.html', { waitUntil: 'networkidle0' });
    await page.pdf({
        path: 'output2.pdf',
        format: 'A4',
        printBackground: true
    });
    await browser.close();
  }, 5000);
})();