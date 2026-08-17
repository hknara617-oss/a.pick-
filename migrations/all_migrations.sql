-- ============================================================
-- A.PICK FULL MIGRATION SUITE FOR SUPABASE (001 - 006)
-- 100% RLS COMPLIANT & ZERO UNPROTECTED TABLES
-- ============================================================

-- 001_core_entities.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sport_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    round_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    league TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    home_team_name TEXT NOT NULL,
    away_team_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sport_event UNIQUE (provider, round_id, provider_event_id)
);

CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
    market_type TEXT NOT NULL,
    market_category_code TEXT,
    line_value NUMERIC(6, 2),
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_definition UNIQUE (event_id, market_type, market_category_code, line_value)
);

CREATE TABLE IF NOT EXISTS selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    selection_type TEXT NOT NULL,
    label TEXT NOT NULL,
    side TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_selection_definition UNIQUE (market_id, selection_type, side)
);

-- 002_market_observations.sql
CREATE TABLE IF NOT EXISTS market_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    round_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    market_status TEXT NOT NULL DEFAULT 'OPEN',
    raw_hash TEXT,
    payload_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_observation_idempotency UNIQUE (provider, round_id, market_id, observed_at, payload_hash)
);

CREATE TABLE IF NOT EXISTS selection_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_observation_id UUID NOT NULL REFERENCES market_observations(id) ON DELETE CASCADE,
    selection_id TEXT NOT NULL,
    label TEXT,
    side TEXT,
    odds NUMERIC(8, 4) NOT NULL,
    implied_probability NUMERIC(8, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_selection_observation UNIQUE (market_observation_id, selection_id)
);

CREATE TABLE IF NOT EXISTS context_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport TEXT NOT NULL,
    event_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_freshness TEXT NOT NULL DEFAULT 'FRESH',
    payload_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_context_snapshot_idempotency UNIQUE (sport, event_id, observed_at, payload_hash)
);

CREATE TABLE IF NOT EXISTS provider_health_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INT,
    http_status INT,
    error_code TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 003_decisions.sql
CREATE TABLE IF NOT EXISTS decision_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'BETMAN',
    round_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    league TEXT NOT NULL,
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sealed_at TIMESTAMPTZ,
    offered_odds_at_seal NUMERIC(8, 4) NOT NULL,
    market_fair_odds_at_seal NUMERIC(8, 4),
    market_no_vig_probability_at_seal NUMERIC(8, 6),
    entry_rule JSONB NOT NULL,
    initial_price_state TEXT NOT NULL,
    thesis JSONB NOT NULL,
    break_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    validity JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_freshness_at_seal TEXT NOT NULL DEFAULT 'FRESH',
    engine_version TEXT NOT NULL DEFAULT 'v1',
    status TEXT NOT NULL DEFAULT 'SEALED',
    payload_hash TEXT NOT NULL,
    CONSTRAINT chk_sealed_immutable CHECK (sealed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS decision_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    before_payload JSONB DEFAULT '{}'::jsonb,
    after_payload JSONB DEFAULT '{}'::jsonb,
    reason_code TEXT NOT NULL,
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    source TEXT NOT NULL DEFAULT 'WATCH_ENGINE',
    previous_event_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL,
    engine_version TEXT NOT NULL DEFAULT 'v1',
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_decision_event_sequence UNIQUE (decision_id, sequence_number),
    CONSTRAINT uq_decision_event_hash UNIQUE (event_hash)
);

CREATE OR REPLACE FUNCTION fn_prevent_sealed_contract_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.sealed_at IS NOT NULL THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: DecisionContract % is sealed and cannot be modified or deleted.', OLD.id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_sealed_contract_mutation ON decision_contracts;
CREATE TRIGGER trg_prevent_sealed_contract_mutation
BEFORE UPDATE OR DELETE ON decision_contracts
FOR EACH ROW EXECUTE FUNCTION fn_prevent_sealed_contract_mutation();

CREATE OR REPLACE FUNCTION fn_prevent_decision_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'APPEND ONLY VIOLATION: DecisionEvent % is an immutable audit record and cannot be modified or deleted.', OLD.id
        USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_decision_event_mutation ON decision_events;
CREATE TRIGGER trg_prevent_decision_event_mutation
BEFORE UPDATE OR DELETE ON decision_events
FOR EACH ROW EXECUTE FUNCTION fn_prevent_decision_event_mutation();

-- 004_watch.sql
CREATE TABLE IF NOT EXISTS watch_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'BETMAN',
    round_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    watch_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_known_good JSONB,
    last_successful_evaluation_at TIMESTAMPTZ,
    last_observed_odds NUMERIC(8, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watch_target_decision UNIQUE (decision_id)
);

CREATE TABLE IF NOT EXISTS watch_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watch_target_id UUID NOT NULL REFERENCES watch_targets(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    evaluated_at TIMESTAMPTZ NOT NULL,
    previous_context JSONB,
    current_context JSONB,
    detected_changes JSONB DEFAULT '[]'::jsonb,
    previous_thesis_state TEXT NOT NULL,
    current_thesis_state TEXT NOT NULL,
    previous_action_state TEXT NOT NULL,
    current_action_state TEXT NOT NULL,
    materiality TEXT NOT NULL,
    source_freshness TEXT NOT NULL DEFAULT 'FRESH',
    engine_version TEXT NOT NULL DEFAULT 'v1',
    input_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watch_evaluation_fingerprint UNIQUE (decision_id, evaluated_at, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS notification_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES decision_contracts(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    action_state TEXT NOT NULL,
    thesis_state TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ,
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_dedupe UNIQUE (dedupe_key)
);

-- 005_indexes.sql
CREATE INDEX IF NOT EXISTS idx_sport_events_query ON sport_events(provider, round_id, sport);
CREATE INDEX IF NOT EXISTS idx_markets_event ON markets(event_id, market_type);
CREATE INDEX IF NOT EXISTS idx_market_obs_lookup ON market_observations(provider, round_id, market_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_lookup ON context_snapshots(sport, event_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_contracts_user ON decision_contracts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_decision_contracts_market ON decision_contracts(provider, round_id, market_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_chain ON decision_events(decision_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS idx_watch_targets_market_active ON watch_targets(provider, round_id, market_id) WHERE status = 'ACTIVE' AND enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_watch_evaluations_history ON watch_evaluations(decision_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notification_candidates(delivery_status, created_at ASC) WHERE delivery_status = 'PENDING';

-- 006_rls_and_security.sql (ALL 13 TABLES ENABLED)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health_observations ENABLE ROW LEVEL SECURITY;

-- Public Shared Read-Only Policies
CREATE POLICY "Public Read Sport Events" ON sport_events FOR SELECT USING (true);
CREATE POLICY "Public Read Markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Public Read Selections" ON selections FOR SELECT USING (true);
CREATE POLICY "Public Read Market Observations" ON market_observations FOR SELECT USING (true);
CREATE POLICY "Public Read Selection Observations" ON selection_observations FOR SELECT USING (true);
CREATE POLICY "Public Read Context Snapshots" ON context_snapshots FOR SELECT USING (true);

-- User-Owned Isolated Policies
CREATE POLICY "Users own contracts" ON decision_contracts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own watch targets" ON watch_targets FOR ALL USING (EXISTS (SELECT 1 FROM decision_contracts WHERE decision_contracts.id = watch_targets.decision_id AND decision_contracts.user_id = auth.uid()));
CREATE POLICY "Users read own events" ON decision_events FOR SELECT USING (EXISTS (SELECT 1 FROM decision_contracts WHERE decision_contracts.id = decision_events.decision_id AND decision_contracts.user_id = auth.uid()));
CREATE POLICY "Users read own notifications" ON notification_candidates FOR ALL USING (EXISTS (SELECT 1 FROM decision_contracts WHERE decision_contracts.id = notification_candidates.decision_id AND decision_contracts.user_id = auth.uid()));

-- System Health Table: No public policies added (Only accessible by backend service_role)
