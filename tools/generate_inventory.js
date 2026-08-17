const fs = require('fs');
const path = require('path');

const fixturePath = path.join('c:/Users/user/Desktop/a.pick/fixtures/betman_sanitized_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json');
const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const schedules = data.compSchedules || [];

// A. unique itemCode values
const itemCodes = new Set();
// B. unique itemName values
const itemNames = new Set();
// C. unique matchSportId values
const matchSportIds = new Set();
// D. unique betId values
const betIds = new Set();
// E. unique bet/game type labels
const betNames = new Set();
// F. leagueCode / leagueName pairs
const leagues = new Map();
// G. fields containing handicap/total values
// H. boolean/status-like fields
const booleanStatusFields = new Set();
// I. distribution of rows per matchSeq
const rowsPerMatchSeq = new Map();
// J. distribution of rows per home/away/startAt tuple
const rowsPerTuple = new Map();

// Types for fields
const fieldTypes = new Map();

schedules.forEach(row => {
    if (row.itemCode) itemCodes.add(row.itemCode);
    if (row.itemName) itemNames.add(row.itemName);
    if (row.matchSportId !== undefined) matchSportIds.add(row.matchSportId);
    if (row.betId) betIds.add(row.betId);
    if (row.betName) betNames.add(row.betName);
    if (row.leagueCode && row.leagueName) {
        leagues.set(row.leagueCode, row.leagueName);
    }

    const matchSeq = row.matchSeq;
    if (matchSeq) {
        rowsPerMatchSeq.set(matchSeq, (rowsPerMatchSeq.get(matchSeq) || 0) + 1);
    }

    const tuple = `${row.homeName}|${row.awayName}|${row.gameDate}`;
    rowsPerTuple.set(tuple, (rowsPerTuple.get(tuple) || 0) + 1);

    Object.keys(row).forEach(key => {
        const val = row[key];
        const type = typeof val;
        
        if (!fieldTypes.has(key)) {
            fieldTypes.set(key, new Set());
        }
        fieldTypes.get(key).add(type);
        
        if (type === 'boolean' || val === 'Y' || val === 'N' || val === '0' || val === '1' || val === 0 || val === 1) {
            booleanStatusFields.add(key);
        }
    });
});

const report = {
    A: Array.from(itemCodes),
    B: Array.from(itemNames),
    C: Array.from(matchSportIds),
    D: Array.from(betIds),
    E: Array.from(betNames),
    F: Array.from(leagues.entries()).map(([k,v]) => ({ code: k, name: v })),
    G: ['handicap', 'total', 'handiAllot', 'underAllot', 'overAllot'], // Need to manually inspect later based on data
    H: Array.from(booleanStatusFields),
    I_distribution: {},
    J_distribution: {}
};

// Summarize distribution
const summarizeMap = (map) => {
    const summary = {};
    for (const count of map.values()) {
        summary[count] = (summary[count] || 0) + 1;
    }
    return summary;
};

report.I_distribution = summarizeMap(rowsPerMatchSeq);
report.J_distribution = summarizeMap(rowsPerTuple);

fs.mkdirSync('c:/Users/user/Desktop/a.pick/reports', { recursive: true });
fs.writeFileSync('c:/Users/user/Desktop/a.pick/reports/BETMAN_FIELD_INVENTORY.json', JSON.stringify(report, null, 2));

let md = `# BETMAN FIELD INVENTORY\n\n`;
md += `## A. Unique itemCode values\n${report.A.map(x => '- ' + x).join('\n')}\n\n`;
md += `## B. Unique itemName values\n${report.B.map(x => '- ' + x).join('\n')}\n\n`;
md += `## C. Unique matchSportId values\n${report.C.map(x => '- ' + x).join('\n')}\n\n`;
md += `## D. Unique betId values\n${report.D.map(x => '- ' + x).join('\n')}\n\n`;
md += `## E. Unique bet/game type labels\n${report.E.map(x => '- ' + x).join('\n')}\n\n`;
md += `## F. League Code / Name pairs\n${report.F.map(x => '- ' + x.code + ': ' + x.name).join('\n')}\n\n`;
md += `## H. Boolean/Status-like fields\n${report.H.map(x => '- ' + x).join('\n')}\n\n`;
md += `## I. Distribution of rows per matchSeq\n`;
Object.entries(report.I_distribution).forEach(([rows, count]) => {
    md += `- ${count} matchSeqs have ${rows} rows\n`;
});
md += `\n## J. Distribution of rows per home/away/startAt tuple\n`;
Object.entries(report.J_distribution).forEach(([rows, count]) => {
    md += `- ${count} tuples have ${rows} rows\n`;
});

fs.writeFileSync('c:/Users/user/Desktop/a.pick/reports/BETMAN_FIELD_INVENTORY.md', md);
console.log('Done');
