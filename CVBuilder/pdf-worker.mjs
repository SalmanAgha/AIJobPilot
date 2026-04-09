import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

/**
 * PDF Worker
 * 
 * Orchestrates the conversion of CV Data -> HTML Template -> ATS-Proof PDF.
 */
export async function generateATSPDF(cvData, templateName = 'modern_ats', outputPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Load the Template
  // For now, we'll use a standard ATS-friendly structure
  const html = renderToHTML(cvData, templateName);

  // 2. Set Content
  await page.setContent(html, { waitUntil: 'networkidle' });

  // 3. Generate PDF with specific ATS-friendly settings
  // - No background images
  // - Standard margins
  // - Embedded text (not outlines)
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in',
    }
  });

  await browser.close();

  if (outputPath) {
    await fs.writeFile(outputPath, pdfBuffer);
  }

  return pdfBuffer;
}

function renderToHTML(data, template) {
  // Simple template literal for ATS-proof HTML
  // Focus: Single column, clear headings, standard fonts (Arial, Helvetica, etc.)
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: auto; }
          h1 { font-size: 24px; margin-bottom: 5px; text-transform: uppercase; color: #000; border-bottom: 2px solid #000; }
          h2 { font-size: 16px; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px solid #ccc; }
          .header { text-align: center; margin-bottom: 20px; }
          .header p { margin: 2px 0; }
          .section { margin-bottom: 15px; }
          .item { margin-bottom: 10px; }
          .item-header { display: flex; justify-content: space-between; font-weight: bold; }
          ul { margin: 5px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.basics.name}</h1>
            <p>${data.basics.email} | ${data.basics.phone} | ${data.basics.location}</p>
            <p><a href="${data.basics.website}">${data.basics.website}</a></p>
          </div>

          <div class="section">
            <h2>Experience</h2>
            ${data.work.map(job => `
              <div class="item">
                <div class="item-header">
                  <span>${job.company}</span>
                  <span>${job.startDate} - ${job.endDate || 'Present'}</span>
                </div>
                <i>${job.position}</i>
                <ul>
                  ${job.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>Skills</h2>
            <p>${data.skills.map(s => `<strong>${s.name}:</strong> ${s.keywords.join(', ')}`).join(' | ')}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
