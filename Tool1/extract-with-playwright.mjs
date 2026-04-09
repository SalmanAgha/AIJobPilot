import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = 'file:///' + path.resolve(__dirname, '../SalmanAgha_AI_2026.pdf').replace(/\\/g, '/');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(pdfPath);
    await page.waitForTimeout(2000); // Wait for PDF viewer to load
    const text = await page.evaluate(() => document.body.innerText);
    console.log('--- PDF TEXT START ---');
    console.log(text);
    console.log('--- PDF TEXT END ---');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
