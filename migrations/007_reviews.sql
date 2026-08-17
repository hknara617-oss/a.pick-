-- ============================================================
-- 007_reviews.sql
-- Review System Persistence Schema (Post-Game Decision Review)
-- ============================================================

CREATE TABLE IF NOT EXISTS entry_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    executed BOOLEAN NOT NULL DEFAULT FALSE,
    entry_odds NUMERIC(8, 4),
    executed_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'UNKNOWN', -- USER_RECORDED | IMPORTED | UNKNOWN
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entry_execution_decision UNIQUE (decision_id)
);

CREATE TABLE IF NOT EXISTS settlement_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    result TEXT NOT NULL, -- WIN | LOSS | PUSH | VOID | UNKNOWN
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'BETMAN',
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settlement_selection UNIQUE (event_id, market_id, selection_id)
);

CREATE TABLE IF NOT EXISTS closing_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    odds NUMERIC(8, 4) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'VERIFIED', -- VERIFIED | APPROXIMATE | UNAVAILABLE
    source_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_closing_price UNIQUE (market_id, selection_id, observed_at)
);

CREATE TABLE IF NOT EXISTS review_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome_result TEXT NOT NULL, -- WIN | LOSS | PUSH | VOID | UNKNOWN
    price_quality_grade TEXT NOT NULL, -- EXCELLENT | GOOD | FAIR | POOR | UNKNOWN
    rule_discipline_grade TEXT NOT NULL, -- FOLLOWED | PARTIAL | VIOLATED
    thesis_review_grade TEXT NOT NULL, -- SOUND | MIXED | UNSOUND | UNREVIEWABLE
    pre_game_final_state TEXT NOT NULL, -- VALID | WEAKENED | BROKEN | WAIT
    decision_quality_grade TEXT NOT NULL, -- EXCELLENT | GOOD | FAIR | POOR | UNRATED
    clv NUMERIC(8, 6),
    clv_method TEXT DEFAULT 'CLV_RETURN_RATIO',
    structured_payload JSONB NOT NULL,
    input_fingerprint TEXT NOT NULL,
    review_version TEXT NOT NULL DEFAULT 'v1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_decision_fingerprint UNIQUE (decision_id, input_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_reviews_decision ON review_results(decision_id);
CREATE INDEX IF NOT EXISTS idx_reviews_quality ON review_results(decision_quality_grade);
CREATE INDEX IF NOT EXISTS idx_reviews_outcome ON review_results(outcome_result);
CREATE INDEX IF NOT EXISTS idx_settlements_lookup ON settlement_results(event_id, market_id, selection_id);
CREATE INDEX IF NOT EXISTS idx_closing_prices_lookup ON closing_prices(market_id, selection_id, observed_at DESC);

-- Enable RLS
ALTER TABLE entry_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_results ENABLE ROW LEVEL SECURITY;

-- Shared public read policies
CREATE POLICY "Public Read Settlements" ON settlement_results FOR SELECT USING (true);
CREATE POLICY "Public Read Closing Prices" ON closing_prices FOR SELECT USING (true);

-- User-scoped policies
CREATE POLICY "Users own executions" ON entry_executions FOR ALL USING (EXISTS (SELECT 1 FROM decision_contracts WHERE decision_contracts.id = entry_executions.decision_id AND decision_contracts.user_id = auth.uid()));
CREATE POLICY "Users own reviews" ON review_results FOR SELECT USING (EXISTS (SELECT 1 FROM decision_contracts WHERE decision_contracts.id = review_results.decision_id AND decision_contracts.user_id = auth.uid()));
