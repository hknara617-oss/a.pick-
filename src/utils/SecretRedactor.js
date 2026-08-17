'use strict';

/**
 * src/utils/SecretRedactor.js
 *
 * Reusable utility to redact sensitive secrets from logs, strings, and objects.
 */
class SecretRedactor {
    static redactText(text) {
        if (typeof text !== 'string') return text;

        let redacted = text;

        // Redact PostgreSQL Connection URLs
        redacted = redacted.replace(
            /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.+)/gi,
            '$1[REDACTED]$3'
        );

        // Redact Bearer Tokens
        redacted = redacted.replace(
            /Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*)/gi,
            'Bearer [REDACTED]'
        );

        // Redact JWT Tokens (eyJ...)
        redacted = redacted.replace(
            /eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g,
            '[REDACTED_JWT]'
        );

        // Redact Supabase secret keys (sb_secret_...)
        redacted = redacted.replace(
            /sb_secret_[A-Za-z0-9\-_]+/gi,
            '[REDACTED_SECRET]'
        );

        // Redact apikey headers/values
        redacted = redacted.replace(
            /(['"]?apikey['"]?\s*[:=]\s*['"]?)[^'",\s}]+/gi,
            '$1[REDACTED]'
        );

        // Redact password JSON fields or query strings
        redacted = redacted.replace(
            /(['"]?password['"]?\s*[:=]\s*['"]?)[^'",\s}]+/gi,
            '$1[REDACTED]'
        );

        return redacted;
    }

    static redactObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.redactObject(item));
        }

        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (
                lowerKey.includes('password') ||
                lowerKey.includes('secret') ||
                lowerKey.includes('service_role') ||
                lowerKey.includes('apikey') ||
                lowerKey.includes('authorization') ||
                lowerKey.includes('token')
            ) {
                clean[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                clean[key] = this.redactText(value);
            } else if (typeof value === 'object' && value !== null) {
                clean[key] = this.redactObject(value);
            } else {
                clean[key] = value;
            }
        }
        return clean;
    }
}

module.exports = SecretRedactor;
