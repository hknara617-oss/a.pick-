const fs = require('fs');

const appJs = fs.readFileSync('public/app.js', 'utf8');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

console.log('=== 1. Checking DOM IDs referenced in app.js ===');
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const missingIds = [];
while ((match = idRegex.exec(appJs)) !== null) {
    const id = match[1];
    const inHtml = indexHtml.includes(`id="${id}"`) || indexHtml.includes(`id='${id}'`);
    const inJs = appJs.includes(`id="${id}"`) || appJs.includes(`id='${id}'`);
    if (!inHtml && !inJs) {
        missingIds.push(id);
    }
}
console.log('Missing DOM IDs:', [...new Set(missingIds)]);

console.log('\n=== 2. Checking Tab navigation and event bindings ===');
const tabButtons = ['today', 'watch', 'review'];
tabButtons.forEach(tab => {
    const hasTabSection = indexHtml.includes(`id="tab-${tab}"`);
    console.log(`Tab [${tab}] section exists in HTML:`, hasTabSection);
});

console.log('\n=== 3. Checking API endpoint contracts ===');
const todayApi = require('../api/today.js');
const watchApi = require('../api/watch.js');
console.log('Today API loaded successfully:', typeof todayApi === 'function');
console.log('Watch API loaded successfully:', typeof watchApi === 'function');

console.log('\n=== 4. Checking Memory / Review Data Structure ===');
const hasMemoryContainer = indexHtml.includes('id="memory-summary-container"');
const hasReviewList = indexHtml.includes('id="recent-reviews-list"');
console.log('Memory container in HTML:', hasMemoryContainer);
console.log('Review list in HTML:', hasReviewList);

console.log('\n=== 5. Checking Seal & Reason Flow Connections ===');
const hasPresetTags = appJs.includes('const PRESET_TAGS');
const hasOpenSealFlow = appJs.includes('function openSealFlow');
const hasExecuteSeal = appJs.includes('function executeDecisionSeal');
console.log('Preset Tags exist:', hasPresetTags);
console.log('openSealFlow function exists:', hasOpenSealFlow);
console.log('executeDecisionSeal exists:', hasExecuteSeal);
