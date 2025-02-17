const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 创建发送邮件的 transporter，使用 QQ 邮箱授权码
const transporter = nodemailer.createTransport({
  service: 'qq', // QQ 邮箱服务
  auth: {
    user: '1011420784@qq.com', // 你的 QQ 邮箱
    pass: 'dujzghmyvsksbchh', // 你的授权码（你可以用密码试试）
  },
});

// 定义发送邮件的函数
function sendEmail(to, subject, htmlContent) {
  const mailOptions = {
    from: '1011420784@qq.com', // 发件人邮箱
    to: to, // 收件人邮箱
    subject: subject, // 邮件主题
    html: htmlContent, // 邮件内容（支持 HTML）
  };

  return transporter.sendMail(mailOptions);
}

// 读取本地 email.html 文件并发送邮件
async function sendEmailFromFile(to, subject, filePath) {
  try {
    const htmlContent = fs.readFileSync(filePath, 'utf8'); // 读取文件内容
    await sendEmail(to, subject, htmlContent); // 发送邮件
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error reading file or sending email:', error);
  }
}

// 批量发送邮件的函数
async function sendBulkEmails(recipients, subject, filePath) {
  const promises = recipients.map((email) => sendEmailFromFile(email, subject, filePath));
  try {
    await Promise.all(promises);
    console.log('All emails sent successfully');
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

// 示例：发送邮件给多个收件人，邮件内容来自本地 email.html 文件
const recipients = ['renren.wang@ebonex.cc', 'wrr1123@qq.com',"wangrenren611@gmail.com"]; // 收件人列表
const subject = 'Test Email from File';
const filePath = path.join(__dirname, './tpl.html'); // 假设 email.html 位于当前目录

sendBulkEmails(recipients, subject, filePath);
