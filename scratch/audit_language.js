'use strict';

const fs = require('fs');
const path = require('path');

const targetFiles = [
    path.join(__dirname, '../apps/web/public/index.html'),
    path.join(__dirname, '../apps/web/public/app.js'),
    path.join(__dirname, '../src/intelligence/EvidenceEngine.js'),
    path.join(__dirname, '../src/services/TodayService.js')
];

const forbidden = [
    '고확신',
    'HIGH CONVICTION',
    '글로벌 공정가',
    '공정가',
    '가격 메리트',
    '가격 마진 확보',
    '가격 엣지'
];

console.log('=== AUDITING FORBIDDEN PRICE LANGUAGE ===');
let totalViolations = 0;

targetFiles.forEach(f => {
    if (!fs.existsSync(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        forbidden.forEach(term => {
            if (line.includes(term)) {
                console.log(`[VIOLATION] ${path.basename(f)}:L${idx+1} -> found "${term}": ${line.trim()}`);
                totalViolations++;
            }
        });
    });
});

console.log(`\nTotal violations found: ${totalViolations}`);
