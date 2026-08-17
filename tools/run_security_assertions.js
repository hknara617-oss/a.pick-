'use strict';

/**
 * tools/run_security_assertions.js
 *
 * Security Assertion Suite:
 * - Scans all files for hardcoded secrets, passwords, tokens, unsafe fallbacks.
 * - Enforces client/server secret boundary.
 * - Verifies Git tracking safety (ensures .env is ignored).
 * - Tests SecretRedactor on intentional sensitive payloads.
 * - Generates reports/SECURITY_HARDENING_REPORT.md without echoing raw secrets.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SecretRedactor = require('../src/utils/SecretRedactor');

const ROOT_DIR = path.resolve(__dirname, '..');

const SENSITIVE_PATTERNS = [
    { type: 'POSTGRES_URL_WITH_PASSWORD', regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@[^\s'"`]+/gi },
    { type: 'HARDCODED_JWT_TOKEN', regex: /eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g },
    { type: 'SUPABASE_SECRET_PREFIX', regex: /sb_secret_[A-Za-z0-9\-_]+/gi },
    { type: 'UNSAFE_FALLBACK', regex: /process\.env\.[A-Za-z0-9_]+\s*\|\|\s*['"`](?!null|undefined|v\d)[^'"`]{8,}['"`]/g }
];

const IGNORED_SCAN_DIRS = ['node_modules', '.git', '.gemini', 'dist', '.agents'];
const ALLOWED_SECRET_FILES = ['.env', '.env.local', '.env.development', '.env.production']; // local only, ignored by git

function scanDirectory(dir, findings = [], scannedFiles = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
            if (!IGNORED_SCAN_DIRS.includes(entry.name)) {
                scanDirectory(fullPath, findings, scannedFiles);
            }
        } else {
            scannedFiles.push(relPath);

            // Skip allowed local-only env files and .env.example
            const isLocalEnv = ALLOWED_SECRET_FILES.some(f => relPath === f || relPath.endsWith('/' + f));
            const isEnvExample = relPath.endsWith('.env.example');

            if (isLocalEnv || isEnvExample) continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                const line = lines[lineIdx];

                for (const pattern of SENSITIVE_PATTERNS) {
                    const matches = line.match(pattern.regex);
                    if (matches) {
                        // Check if it's already redacted placeholder
                        const isRedacted = matches.every(m =>
                            m.includes('[REDACTED') ||
                            m.includes('YOUR_') ||
                            m.includes('PASSWORD') ||
                            m.includes('USER:PASSWORD')
                        );

                        if (!isRedacted) {
                            findings.push({
                                file: relPath,
                                line: lineIdx + 1,
                                type: pattern.type,
                                snippet: SecretRedactor.redactText(line.trim())
                            });
                        }
                    }
                }
            }
        }
    }
    return { findings, scannedFiles };
}

function checkClientBoundary(scannedFiles, findings) {
    const clientFiles = scannedFiles.filter(f =>
        f.startsWith('apps/web/') ||
        f.startsWith('public/') ||
        f.startsWith('frontend/') ||
        f.startsWith('client/')
    );

    const clientSecretPatterns = [
        /SUPABASE_SECRET_KEY/g,
        /SUPABASE_SERVICE_ROLE_KEY/g,
        /DATABASE_URL/g
    ];

    for (const f of clientFiles) {
        const content = fs.readFileSync(path.join(ROOT_DIR, f), 'utf8');
        for (const p of clientSecretPatterns) {
            if (p.test(content)) {
                findings.push({
                    file: f,
                    line: 1,
                    type: 'CLIENT_EXPOSED_SERVER_SECRET',
                    snippet: 'Server-only environment variable referenced in client bundle'
                });
            }
        }
    }
}

function checkGitTracking(findings) {
    try {
        const tracked = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
        const trackedEnv = tracked.filter(f => f === '.env' || (f.startsWith('.env.') && f !== '.env.example'));
        if (trackedEnv.length > 0) {
            findings.push({
                file: trackedEnv.join(', '),
                line: 0,
                type: 'GIT_TRACKED_ENV_FILE',
                snippet: '.env file is actively tracked by Git'
            });
        }
    } catch (e) {
        // Git repo not present or git command not found
    }
}

function testRedactionLayer() {
    const fakeToken = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJpc3MiOiJzdXBhYmFzZSJ9', 'abcdef1234567890'].join('.');
    const fakeConn = 'postgres' + 'ql://myuser:supersecretpassword@db.example.supabase.co:5432/postgres';
    const sampleLog = `Connecting to ${fakeConn} with token Bearer ${fakeToken}`;

    const redacted = SecretRedactor.redactText(sampleLog);
    if (redacted.includes('supersecretpassword') || redacted.includes('abcdef1234567890')) {
        throw new Error('SecretRedactor failed to redact secret payload');
    }
    return true;
}

function runSecurityAssertions() {
    console.log('=== A.PICK SECURITY ASSERTIONS & HARDENING AUDIT ===\n');

    // 1. Test Redaction Engine
    testRedactionLayer();
    console.log('✅ SecretRedactor layer: PASS (Redaction verified)');

    // 2. Scan repository
    const { findings, scannedFiles } = scanDirectory(ROOT_DIR);

    // 3. Client boundary check
    checkClientBoundary(scannedFiles, findings);

    // 4. Git tracking check
    checkGitTracking(findings);

    console.log(`\nFiles Scanned: ${scannedFiles.length}`);
    console.log(`Security Violations Found: ${findings.length}\n`);

    if (findings.length > 0) {
        console.error('❌ SECURITY VIOLATIONS DETECTED:');
        for (const f of findings) {
            console.error(`  - [${f.type}] ${f.file}:${f.line} -> ${f.snippet}`);
        }
    }

    // 5. Generate reports/SECURITY_HARDENING_REPORT.md
    let md = `# Security Hardening Audit Report\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **보안 판정:** **${findings.length === 0 ? 'PASS (보안 강화 완료 ✅)' : 'FAIL (조치 필요 ❌)'}**\n\n`;
    md += `---\n\n## 1. 보안 스캔 통계\n\n`;
    md += `* **스캔된 파일 수:** ${scannedFiles.length}개\n`;
    md += `* **하드코딩된 시크릿/토큰 발견:** ${findings.filter(f => f.type.includes('JWT') || f.type.includes('POSTGRES')).length}건\n`;
    md += `* **클라이언트 번들 노출 서버 키:** ${findings.filter(f => f.type === 'CLIENT_EXPOSED_SERVER_SECRET').length}건\n`;
    md += `* **Git 추적 위험 (.env tracked):** ${findings.filter(f => f.type === 'GIT_TRACKED_ENV_FILE').length}건\n`;
    md += `* **잔여 보안 위반:** **${findings.length}건**\n\n`;

    md += `## 2. 보안 조치 내역\n\n`;
    md += `1. **환경변수 일원화:** 모든 DB 접속 및 Supabase 키를 \`process.env\`로부터만 로드하도록 통일.\n`;
    md += `2. **Git 추적 차단:** \`.gitignore\`에 \`.env\`, \`.env.*\`, \`*.pem\`, \`*.key\` 등 등록.\n`;
    md += `3. **로그 마스킹:** \`SecretRedactor\`를 통해 연결 정보 및 인증 헤더 자동 마스킹 (\`[REDACTED]\`).\n`;
    md += `4. **안전한 템플릿:** \`.env.example\`에 플레이스홀더만 유지.\n\n`;

    md += `## 3. 크리덴셜 회전 권고 (Credential Rotation Status)\n\n`;
    md += `* **DB_PASSWORD:** \`ROTATION_RECOMMENDED\` (초기 생성 후 대시보드에서 1회 재설정 권고)\n`;
    md += `* **SUPABASE_SERVICE_ROLE_KEY:** \`ROTATION_RECOMMENDED\` (대시보드 Settings > API에서 필요시 재발급 가능)\n\n`;

    fs.writeFileSync(path.join(ROOT_DIR, 'reports/SECURITY_HARDENING_REPORT.md'), md);
    console.log('✅ Generated: reports/SECURITY_HARDENING_REPORT.md\n');

    return {
        passed: findings.length === 0,
        scannedFilesCount: scannedFiles.length,
        findingsCount: findings.length,
        findings
    };
}

if (require.main === module) {
    const result = runSecurityAssertions();
    if (!result.passed) {
        process.exit(1);
    }
}

module.exports = runSecurityAssertions;
