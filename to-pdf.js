const fs = require('fs/promises');
const path = require('path');
const { Command } = require('commander');
const puppeteer = require('puppeteer');

function isUrl(input) {
    try {
        new URL(input);
        return true;
    } catch {
        return false;
    }
}

async function generatePdf(source, outputPath, options = {}) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium']
    });
    const page = await browser.newPage();

    try {
        // 确保HTML内容以UTF-8编码加载
        if (source.type === 'html') {
            const htmlWithCharset = source.source.includes('<meta charset') 
                ? source.source 
                : `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${source.source}</body></html>`;
            await page.setContent(htmlWithCharset, {
                waitUntil: 'networkidle2',
                timeout: 30000,
                ...(options.baseUrl && { url: options.baseUrl })
            });
        } else if (source.type === 'url') {
            await page.goto(source.source, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
        }

        // 添加字体样式，区分中英文
        await page.addStyleTag({
            content: `
                @font-face {
                    font-family: 'Bevietnam';
                    src: url('https://global-static.ebonex.io/front/fromSDK/cfa0762a-1c31-4175-b2d0-4226963b18bc.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'BevietnamtBold';
                    src: url('https://global-static.ebonex.io/front/fromSDK/f43e7e28-d4be-4cb4-9e30-45ab5668969d.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'fontMedium';
                    src: url('https://global-static.ebonex.io/front/fromSDK/2c4130c6-8470-4852-8bf2-176c4cfd6408.ttf') format('truetype');
                }
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');
                @media print {
                    html, body {
                        height: ${options.autoHeight ? 'auto' : '100%'};
                        margin: 0 !important;
                        padding: 0 !important;
                        font-family: 'SimSun', 'Noto Sans SC', 'Arial Unicode MS', 'WenQuanYi Zen Hei', sans-serif !important;
                        -webkit-font-smoothing: antialiased;
                    }
                    .page-break { display: none !important; }
                }
                /* 默认字体：中文优先 */
                * {
                    font-family: 'SimSun', 'Noto Sans SC', 'Arial Unicode MS', 'WenQuanYi Zen Hei', sans-serif !important;
                }
                /* 英文内容使用Bevietnam字体 */
                [lang="en"], .english, [style*="PAYMENT"], [style*="CONFIRMATION"], [style*="Payment Details"], [style*="Important Information"], [style*="Customer Name"], [style*="Payment ID"], [style*="Payment Booked by"], [style*="Payment Date"], [style*="Payment Amount"], [style*="Fee"] {
                    font-family: 'Bevietnam', 'BevietnamtBold', 'fontMedium', 'Arial', sans-serif !important;
                }
                /* 中文内容强制使用支持CJK的字体 */
                [lang="zh"], [lang="zh-CN"], [lang="zh-TW"], .chinese {
                    font-family: 'SimSun', 'Noto Sans SC', 'Arial Unicode MS', 'WenQuanYi Zen Hei', sans-serif !important;
                }
            `
        });

        // 动态检测中文和英文内容，添加class和lang属性
        await page.evaluate(() => {
            const elements = document.querySelectorAll('*:not(:empty)');
            elements.forEach(el => {
                const text = el.textContent || '';
                if (/[\u4e00-\u9fff]/.test(text)) {
                    el.classList.add('chinese');
                    el.setAttribute('lang', 'zh-CN');
                    el.style.fontFamily = "'SimSun', 'Noto Sans SC', 'Arial Unicode MS', 'WenQuanYi Zen Hei', sans-serif";
                } else if (/^[A-Za-z0-9\s:,.()]+$/.test(text)) {
                    el.classList.add('english');
                    el.setAttribute('lang', 'en');
                    el.style.fontFamily = "'Bevietnam', 'BevietnamtBold', 'fontMedium', 'Arial', sans-serif";
                }
            });
        });

        // // 调试：检查字体加载和中英文渲染
        // const debugInfo = await page.evaluate(() => {
        //     const fonts = Array.from(document.fonts.entries()).map(([font]) => font.family);
        //     // 测试中文
        //     const chineseTest = document.createElement('div');
        //     chineseTest.className = 'chinese';
        //     chineseTest.setAttribute('lang', 'zh-CN');
        //     chineseTest.style.fontFamily = "'SimSun', 'Noto Sans SC', 'Arial Unicode MS', 'WenQuanYi Zen Hei', sans-serif";
        //     // chineseTest.textContent = '测试中文：慧行小鸥(成都)教育咨询有限责任公司';
        //     // document.body.appendChild(chineseTest);
        //     const chineseFont = window.getComputedStyle(chineseTest).fontFamily;
        //     // 测试英文
        //     const englishTest = document.createElement('div');
        //     englishTest.className = 'english';
        //     englishTest.setAttribute('lang', 'en');
        //     englishTest.style.fontFamily = "'Bevietnam', 'BevietnamtBold', 'fontMedium', 'Arial', sans-serif";
        //     // englishTest.textContent = 'PAYMENT CONFIRMATION';
        //     // document.body.appendChild(englishTest);
        //     const englishFont = window.getComputedStyle(englishTest).fontFamily;
        //     // 检查HTML中特定内容的字体
        //     const htmlChinese = document.querySelector('td span:not([style*="font-family: Bevietnam"])');
        //     const htmlEnglish = document.querySelector('span[style*="PAYMENT"]');
        //     return {
        //         fonts,
        //         chineseFont,
        //         englishFont,
        //         chineseTest: chineseTest.textContent,
        //         htmlChineseFont: htmlChinese ? window.getComputedStyle(htmlChinese).fontFamily : 'Not found',
        //         htmlEnglishFont: htmlEnglish ? window.getComputedStyle(htmlEnglish).fontFamily : 'Not found'
        //     };
        // });
        // console.log('Loaded fonts:', debugInfo.fonts);
        // console.log('Computed font for Chinese test:', debugInfo.chineseFont);
        // console.log('Computed font for English test:', debugInfo.englishFont);
        // console.log('Computed font for HTML Chinese content:', debugInfo.htmlChineseFont);
        // console.log('Computed font for HTML English content:', debugInfo.htmlEnglishFont);
        // console.log('Chinese test content:', debugInfo.chineseTest);

        const { contentWidth, contentHeight } = await page.evaluate(() => ({
            contentWidth: document.documentElement.scrollWidth,
            contentHeight: document.documentElement.scrollHeight
        }));

        // A1尺寸：594mm × 841mm，转换为像素（默认72 DPI）
        const a1WidthPx = Math.round(420 * 72 / 25.4); // 约1684px
        const a1HeightPx = Math.round(594 * 72 / 25.4); // 约2384px

        const pdfOptions = {
            path: outputPath,
            printBackground: options.background !== undefined ? options.background : true,
            margin: {
                top: options.margin || 0,
                right: options.margin || 0,
                bottom: options.margin || 0,
                left: options.margin || 0
            },
            width: options.width ? `${options.width}mm` : `${a1WidthPx}px`,
            height: `${a1HeightPx}px`,
            displayHeaderFooter: false,
            pageRanges: '1',
            format: 'A2', // 设置为A1尺寸
            preferCSSPageSize: true
        };

        await page.pdf(pdfOptions);
    } catch (error) {
        console.error(`❌ PDF generation error: ${error.message}`);
        throw error;
    } finally {
        await browser.close();
    }
}

async function convertFile(inputPath, outputPath, options) {
    try {
        const html = await fs.readFile(inputPath, 'utf8');
        console.log('Input HTML (first 100 chars):', html.substring(0, 100));
        const output = path.isAbsolute(outputPath) ? 
            outputPath : 
            path.join(process.cwd(), outputPath);
        
        await generatePdf({ type: 'html', source: html }, output, options);
        console.log(`✅ PDF generated: ${output}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

async function convertUrl(url, outputPath, options) {
    try {
        const output = path.isAbsolute(outputPath) ? 
            outputPath : 
            path.join(process.cwd(), outputPath);
        
        await generatePdf({ type: 'url', source: url }, output, options);
        console.log(`✅ PDF generated: ${output}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

const program = new Command();
program
    .name('unipage-pdf')
    .description('Generate PDF from HTML file or URL with enhanced Chinese and English font support')
    .version('1.0.0')
    .argument('<input>', 'HTML file path or URL')
    .argument('[output]', 'Output PDF path', 'output.pdf')
    .option('-w, --width <mm>', 'Page width in millimeters', parseFloat)
    .option('-m, --margin <mm>', 'Margin size in millimeters', 0)
    .option('-b, --base-url <url>', 'Base URL for relative resources')
    .option('--no-background', 'Disable background graphics')
    .option('--dpi <number>', 'DPI for pixel conversion (default: 72)', parseFloat, 72)
    .action((input, output, options) => {
        if (isUrl(input)) {
            convertUrl(input, output, options);
        } else {
            const inputPath = path.resolve(process.cwd(), input);
            convertFile(inputPath, output, options);
        }
    });

program.parse(process.argv);