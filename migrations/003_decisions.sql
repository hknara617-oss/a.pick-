-- migrations/003_decisions.sql
-- Immutable sealed decision contracts and append-only decision audit events

CREATE TABLE IF NOT EXISTS decision_contracts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(64) NOT NULL,
    round_id VARCHAR(64) NOT NULL,
    sport VARCHAR(64) NOT NULL,
    league VARCHAR(128) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    market_id VARCHAR(128) NOT NULL,
    selection_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    sealed_at TIMESTAMPTZ,
    offered_odds_at_seal NUMERIC(8, 4) NOT NULL,
    market_fair_odds_at_seal NUMERIC(8, 4),
    market_no_vig_probability_at_seal NUMERIC(8, 6),
    entry_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
    initial_price_state VARCHAR(32) NOT NULL,
    thesis JSONB NOT NULL DEFAULT '{}'::jsonb,
    break_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    validity JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_freshness_at_seal JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    contract_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    payload_hash VARCHAR(64) NOT NULL,
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutability Trigger: prevent UPDATE or DELETE on sealed contracts
CREATE OR REPLACE FUNCTION fn_prevent_sealed_contract_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.sealed_at IS NOT NULL THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: DecisionContract % is sealed and cannot be modified or deleted.', OLD.id
            USING ERRCODE = '23514'; -- check_violation
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_decision_contract_update ON decision_contracts;
CREATE TRIGGER trg_prevent_decision_contract_update
BEFORE UPDATE OR DELETE ON decision_contracts
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_sealed_contract_mutation();

-- Decision Events (Append-only audit trail with cryptographic hash chaining)
CREATE TABLE IF NOT EXISTS decision_events (
    id UUID PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id),
    sequence_number INT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    before_payload JSONB DEFAULT '{}'::jsonb,
    after_payload JSONB DEFAULT '{}'::jsonb,
    reason_code VARCHAR(64),
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    source VARCHAR(64) NOT NULL DEFAULT 'WATCH_ENGINE',
    previous_event_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL,
    engine_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_decision_event_seq UNIQUE (decision_id, sequence_number),
    CONSTRAINT uq_decision_event_hash UNIQUE (event_hash)
);

-- Prevent UPDATE or DELETE on decision_events
CREATE OR REPLACE FUNCTION fn_prevent_decision_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'APPEND ONLY VIOLATION: DecisionEvent % is an immutable audit record and cannot be modified or deleted.', OLD.id
        USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_decision_event_update ON decision_events;
CREATE TRIGGER trg_prevent_decision_event_update
BEFORE UPDATE OR DELETE ON decision_events
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_decision_event_mutation();
