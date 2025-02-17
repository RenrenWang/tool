const axios = require('axios');
const fs = require('fs');

const DEEPSEEK_API_KEY = "f817e544-54d4-442e-997d-47e1d20e5d18";
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

async function streamDeepSeek(prompt) {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: "ep-20250215003253-flmhq",
        messages: [{ role: "user", content: prompt }],
        stream:true
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
           'Content-Type': 'application/json',
          'Accept': 'text/event-stream', // 确保接受事件流
        },
        responseType: 'stream', // 启用流式响应类型
        timeout: 1000 * 50,
      }
    );

  

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') return;
        try {
          const parsed = JSON.parse(message);
          const content = parsed.choices[0]?.delta?.content;
          if (content) process.stdout.write(content);
        } catch (err) {
          console.error('解析错误:', err);
        }
      }
    });

    response.data.on('end', () => {
      console.log("流式传输完成")
   });

   response.data.on('error', (error) => {
      // 流处理过程中发生错误的处理逻辑
      console.log("error",error)
   });
  } catch (error) {
    console.error('流式请求错误:', error);
    throw error;
  }
}

// 使用示例
(async () => {
  try {
    const response = await streamDeepSeek("如在nodejs环境调用deepseek的r1 api接口");
    console.log("\nAI 回复完成",response);
  } catch (error) {
    console.error("请求失败：", error);
  }
})();