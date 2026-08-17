-- ============================================================
-- 010_founder_dogfood.sql
-- Founder Dogfood & Real Feedback Logging Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    screen TEXT NOT NULL,
    decision_id UUID REFERENCES decision_contracts(id) ON DELETE SET NULL,
    issue_type TEXT NOT NULL, -- CONFUSING | WRONG_DATA | TOO_MUCH | TOO_LITTLE | SLOW | MISSING_ACTION | COPY | OTHER
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_feedback_user ON founder_feedback(user_id, created_at);

ALTER TABLE founder_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own founder feedback" ON founder_feedback FOR ALL USING (user_id = auth.uid());
