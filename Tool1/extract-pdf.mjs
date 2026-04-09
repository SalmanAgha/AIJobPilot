import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('../SalmanAgha_AI_2026.pdf');

pdf(dataBuffer).then(function(data) {
    console.log('--- PDF TEXT START ---');
    console.log(data.text);
    console.log('--- PDF TEXT END ---');
}).catch(err => {
    console.error('Error parsing PDF:', err);
});
