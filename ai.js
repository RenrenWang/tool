const OpenAI = require('openai');
const fs = require('fs');
const chalk = require('chalk').default;

// const openai = new OpenAI({
//   apiKey: "sk-5dbd5fcd4ca0477ebef9775f92ad8b5e",
//   baseURL: 'https://api.deepseek.com',
// });

const openai = new OpenAI({
  apiKey: "sk-5dbd5fcd4ca0477ebef9775f92ad8b5e",
  // baseURL: 'http://192.168.31.156:11434/v1',
baseURL: 'http:/localhost:11434/v1',

});
//请求接口 https://finance.pae.baidu.com/vapi/v1/getquotation?all=1&srcid=5353&pointType=string&group=quotation_fiveday_ab&market_type=ab&new_Format=1&finClientType=pc&query=300603&code=300603&name=%E7%AB%8B%E6%98%82%E6%8A%80%E6%9C%AF



async function main() {
  // Streaming:
  console.log('----- streaming request -----')
  const htmlContent = fs.readFileSync('/Users/wrr/Desktop/@wr/website/src/hooks/use-quick-payment-quote.ts', 'utf8'); 
  const prompt = fs.readFileSync('/Users/wrr/Desktop/i18n-tool/prompt.md', 'utf8'); 
  console.log(chalk.green('loading...'));
  const stream = await openai.chat.completions.create({
    messages:[{ role: 'system', content: '作为资深前端工程师，请对以下 JavaScript/React/Less/Hooks 代码进行全面审查，按优先级分类问题并提供具体优化建议,给出优化后的代码'}, { role: 'user', content:`${htmlContent}：检查代码，是否有bug，修复代码问题，给出修改后的代码`},
  ],
    model:"gemma3:12b",//'gemma3:12b',//'deepseek-reasoner',//'deepseek-r1:8b',//'gemma3:4b', 
    stream: true,
  });
  let data = '';
  for await (const part of stream) {
 
    if(part.choices[0]?.delta?.reasoning_content){

      process.stdout.write(part.choices[0]?.delta?.reasoning_content || '');
    }else{
      data+=part.choices[0]?.delta?.content || '';
      process.stdout.write(part.choices[0]?.delta?.content || '');
    }
  }fs.writeFileSync('/Users/wrr/Desktop/i18n-tool/2.md', data);
  process.stdout.write('\n');
}

main();