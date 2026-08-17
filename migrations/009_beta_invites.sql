-- ============================================================
-- 009_beta_invites.sql
-- Beta Access Control & Notification Inbox Persistence Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS beta_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    invite_code TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'INVITED', -- INVITED | ACCEPTED | REVOKED
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_inbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | CRITICAL
    dedupe_key TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_inbox_dedupe UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_beta_invites_email ON beta_invites(email);
CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, read_at);

-- Enable RLS
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_inbox ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read beta invites by email" ON beta_invites FOR SELECT USING (true);
CREATE POLICY "Users own notification inbox" ON notification_inbox FOR ALL USING (user_id = auth.uid());
