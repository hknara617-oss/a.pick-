'use strict';

/**
 * tools/verify_supabase_schema.js
 * Checks live schema and tables on remote Supabase instance.
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');

async function checkSupabaseSchema() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in environment.');
        return { statusCode: 400, tables: [] };
    }

    const targetUrl = supabaseUrl.endsWith('/') ? `${supabaseUrl}rest/v1/` : `${supabaseUrl}/rest/v1/`;

    return new Promise((resolve) => {
        https.get(targetUrl, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const spec = JSON.parse(data);
                    const tables = Object.keys(spec.definitions || {});
                    console.log('=== SUPABASE REMOTE SCHEMA STATUS ===');
                    console.log('HTTP Status:', res.statusCode);
                    console.log('Public Tables Detected:', tables.length);
                    console.log('Table List:', tables);
                    resolve({ statusCode: res.statusCode, tables });
                } catch (e) {
                    console.log('Error parsing response:', e.message);
                    resolve({ statusCode: res.statusCode, tables: [] });
                }
            });
        }).on('error', (e) => {
            console.log('Network Error:', e.message);
            resolve({ error: e.message, tables: [] });
        });
    });
}

if (require.main === module) {
    checkSupabaseSchema();
}

module.exports = checkSupabaseSchema;
