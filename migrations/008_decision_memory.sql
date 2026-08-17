-- ============================================================
-- 008_decision_memory.sql
-- Decision Memory & Behavioral Pattern Engine Persistence Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS decision_memory_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    sport TEXT NOT NULL,
    league TEXT NOT NULL,
    market_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed BOOLEAN NOT NULL DEFAULT FALSE,
    entry_odds NUMERIC(8, 4),
    entry_threshold NUMERIC(8, 4),
    price_quality TEXT NOT NULL,
    rule_discipline TEXT NOT NULL,
    thesis_quality TEXT NOT NULL,
    decision_quality TEXT NOT NULL,
    pre_game_final_state TEXT NOT NULL,
    break_condition_count INTEGER NOT NULL DEFAULT 0,
    break_condition_hits INTEGER NOT NULL DEFAULT 0,
    user_override_used BOOLEAN NOT NULL DEFAULT FALSE,
    threshold_crossed_before_entry BOOLEAN NOT NULL DEFAULT FALSE,
    entered_below_threshold BOOLEAN NOT NULL DEFAULT FALSE,
    entered_after_break BOOLEAN NOT NULL DEFAULT FALSE,
    entered_while_review BOOLEAN NOT NULL DEFAULT FALSE,
    entered_while_wait BOOLEAN NOT NULL DEFAULT FALSE,
    closing_line_available BOOLEAN NOT NULL DEFAULT FALSE,
    clv NUMERIC(8, 6),
    outcome TEXT NOT NULL DEFAULT 'UNKNOWN',
    memory_version TEXT NOT NULL DEFAULT 'v1.0.0',
    CONSTRAINT uq_memory_record_decision UNIQUE (decision_id)
);

CREATE TABLE IF NOT EXISTS behavior_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EMERGING', -- EMERGING | ESTABLISHED | STRONG | INACTIVE
    sample_count INTEGER NOT NULL DEFAULT 0,
    applicable_count INTEGER NOT NULL DEFAULT 0,
    occurrence_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    confidence NUMERIC(6, 4) NOT NULL DEFAULT 0,
    first_observed_at TIMESTAMPTZ NOT NULL,
    last_observed_at TIMESTAMPTZ NOT NULL,
    description_template TEXT NOT NULL,
    implication_template TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_pattern UNIQUE (user_id, pattern_code)
);

CREATE TABLE IF NOT EXISTS pattern_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES behavior_patterns(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    sport TEXT NOT NULL,
    market TEXT NOT NULL,
    observed_behavior TEXT NOT NULL,
    review_axis TEXT NOT NULL,
    evidence_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pattern_evidence UNIQUE (pattern_id, decision_id)
);

CREATE TABLE IF NOT EXISTS memory_implications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_code TEXT NOT NULL,
    insight TEXT NOT NULL,
    implication TEXT NOT NULL,
    next_behavior TEXT NOT NULL,
    applies_to TEXT NOT NULL DEFAULT 'GLOBAL',
    evidence_count INTEGER NOT NULL DEFAULT 0,
    confidence NUMERIC(6, 4) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | DISMISSED | SUPERSEDED
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposed_behavior_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_pattern_id UUID REFERENCES behavior_patterns(id) ON DELETE SET NULL,
    rule_type TEXT NOT NULL,
    rule_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROPOSED', -- PROPOSED | ACCEPTED | DECLINED | EXPIRED
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS memory_scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL DEFAULT 'ALL_TIME', -- LAST_10 | LAST_25 | LAST_50 | ALL_TIME
    price_discipline_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    rule_compliance_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    sound_thesis_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    good_price_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    override_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    below_threshold_entry_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    reviewed_decisions INTEGER NOT NULL DEFAULT 0,
    executed_decisions INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_window_scorecard UNIQUE (user_id, window_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_records_user ON decision_memory_records(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user ON behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_implications_user ON memory_implications(user_id);
CREATE INDEX IF NOT EXISTS idx_proposed_rules_user ON proposed_behavior_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_user ON memory_scorecards(user_id);

-- Enable RLS
ALTER TABLE decision_memory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_implications ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_behavior_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_scorecards ENABLE ROW LEVEL SECURITY;

-- User Policies
CREATE POLICY "Users view own memory records" ON decision_memory_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users view own behavior patterns" ON behavior_patterns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users view own implications" ON memory_implications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own proposed rules" ON proposed_behavior_rules FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users view own scorecards" ON memory_scorecards FOR SELECT USING (user_id = auth.uid());
