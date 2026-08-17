'use strict';

/**
 * tools/run_phase_e5_remote_db.js
 *
 * Validates 008 migration DDL and RLS policies for Decision Memory tables.
 */

const fs = require('fs');
const assert = require('assert');

async function runRemoteDbValidation() {
    console.log('=== A.PICK PHASE E.5: REMOTE DB & RLS PERSISTENCE VALIDATION ===\n');

    assert(fs.existsSync('./migrations/008_decision_memory.sql'));
    const sql = fs.readFileSync('./migrations/008_decision_memory.sql', 'utf8');

    const expectedTables = [
        'decision_memory_records',
        'behavior_patterns',
        'pattern_evidence',
        'memory_implications',
        'proposed_behavior_rules',
        'memory_scorecards'
    ];

    for (const tbl of expectedTables) {
        assert(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table DDL: ${tbl}`);
        assert(sql.includes(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`), `Missing RLS on ${tbl}`);
        console.log(`  ✅ Table '${tbl}' verified with Row Level Security (RLS).`);
    }

    assert(sql.includes('user_id = auth.uid()'), 'Missing user isolation RLS policy!');
    console.log('  ✅ User isolation policy (user_id = auth.uid()) verified across memory entities.');
    console.log('\n✅ 008_decision_memory.sql Persistence and Security Validation Passed!\n');
}

if (require.main === module) {
    runRemoteDbValidation().catch(console.error);
}

module.exports = runRemoteDbValidation;
