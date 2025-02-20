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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        if (source.type === 'html') {
            await page.setContent(source.source, {
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

        await page.addStyleTag({
            content: `
                @media print {
                    html, body {
                        height: ${options.autoHeight ? 'auto' : '100%'};
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .page-break { display: none !important; }
                }
            `
        });

        const { contentWidth, contentHeight } = await page.evaluate(() => ({
            contentWidth: document.documentElement.scrollWidth,
            contentHeight: document.documentElement.scrollHeight
        }));

        const pdfOptions = {
            path: outputPath,
            printBackground: options.background !== undefined ? options.background : true,
            margin: {
                top: options.margin || 0,
                right: options.margin || 0,
                bottom: options.margin || 0,
                left: options.margin || 0
            },
            width: options.width ? `${options.width}mm` : `${contentWidth}px`,
            height: `${contentHeight}px`,
            displayHeaderFooter: false,
            pageRanges: '1'
        };

        await page.pdf(pdfOptions);
    } finally {
        await browser.close();
    }
}

async function convertFile(inputPath, outputPath, options) {
    try {
        const html = await fs.readFile(inputPath, 'utf8');
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
    .description('Generate PDF from HTML file or URL')
    .version('1.0.0')
    .argument('<input>', 'HTML file path or URL')
    .argument('[output]', 'Output PDF path', 'output.pdf')
    .option('-w, --width <mm>', 'Page width in millimeters', parseFloat)
    .option('-m, --margin <mm>', 'Margin size in millimeters', 0)
    .option('-b, --base-url <url>', 'Base URL for relative resources')
    .option('--no-background', 'Disable background graphics')
    .action((input, output, options) => {
        if (isUrl(input)) {
            convertUrl(input, output, options);
        } else {
            const inputPath = path.resolve(process.cwd(), input);
            convertFile(inputPath, output, options);
        }
    });

program.parse(process.argv);