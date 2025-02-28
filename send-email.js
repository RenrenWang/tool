const axios = require('axios');
const fs = require('fs');
const path = require('path');
const compress=require('./compress-html')
// 读取本地文件内容，确保文件路径正确
//email-invoice-content
//confirmation
const htmlContent = fs.readFileSync('/Users/wrr/Desktop/@wr/study-pay/tpl/email-confirmation.html', 'utf8');
// const htmlContent = fs.readFileSync('./tpl.html', 'utf8');

const content=compress.crushToSingleLine(htmlContent)
// 构造请求数据
const data = {
  emails: ["renren.wang@ebonex.cc","1011420784@qq.com"],
  title: "我是标题",
  content
};

// 注意添加协议（http://或https://），确保地址正确
const url = 'http://ebfs-message-server.ebfs.svc.ebonex-newdev:8080/v1/message/send-mock-mail';

// 发送POST请求
axios.post(url, data, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('响应数据:', response.data);
})
.catch(error => {
  console.error('请求出错:', error);
});
