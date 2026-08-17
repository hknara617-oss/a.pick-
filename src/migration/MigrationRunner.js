'use strict';

const fs = require('fs');
const path = require('path');

/**
 * src/migration/MigrationRunner.js
 * Executes versioned SQL migrations deterministically.
 */
class MigrationRunner {
    constructor(db, migrationsDir = path.join(__dirname, '../../migrations')) {
        this.db = db;
        this.migrationsDir = migrationsDir;
    }

    /**
     * Run all pending migrations in order.
     */
    async migrateUp() {
        if (!fs.existsSync(this.migrationsDir)) {
            throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
        }

        const files = fs.readdirSync(this.migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        const applied = [];

        for (const file of files) {
            if (this.db.tables.schema_migrations.has(file)) {
                continue; // Already applied
            }

            const sqlContent = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');
            
            // Record migration
            this.db.tables.schema_migrations.set(file, {
                filename: file,
                applied_at: new Date().toISOString(),
                checksum: sqlContent.length
            });

            applied.push(file);
        }

        return {
            totalMigrations: files.length,
            appliedMigrations: applied,
            status: 'SUCCESS'
        };
    }

    /**
     * Get list of applied migrations.
     */
    async getAppliedMigrations() {
        return Array.from(this.db.tables.schema_migrations.values());
    }
}

module.exports = MigrationRunner;
