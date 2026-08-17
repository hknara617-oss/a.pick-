-- migrations/004_watch.sql
-- Operational WATCH tracking: watch_targets, watch_evaluations, notification_candidates

CREATE TABLE IF NOT EXISTS watch_targets (
    id UUID PRIMARY KEY,
    decision_id UUID NOT NULL UNIQUE REFERENCES decision_contracts(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, EXPIRED, CLOSED
    watch_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_successful_evaluation_at TIMESTAMPTZ,
    last_provider_observation_at TIMESTAMPTZ,
    last_context_observation_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watch_evaluations (
    id UUID PRIMARY KEY,
    watch_target_id UUID NOT NULL REFERENCES watch_targets(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id),
    evaluated_at TIMESTAMPTZ NOT NULL,
    previous_thesis_state VARCHAR(32) NOT NULL,
    current_thesis_state VARCHAR(32) NOT NULL,
    previous_action_state VARCHAR(32) NOT NULL,
    current_action_state VARCHAR(32) NOT NULL,
    materiality VARCHAR(32) NOT NULL,
    detected_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_freshness JSONB NOT NULL DEFAULT '{}'::jsonb,
    notification_candidate_id UUID,
    engine_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    input_fingerprint VARCHAR(64) NOT NULL,
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watch_evaluation_fingerprint UNIQUE (decision_id, evaluated_at, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS notification_candidates (
    id UUID PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES decision_contracts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    dedupe_key VARCHAR(128) NOT NULL,
    action_state VARCHAR(32) NOT NULL,
    thesis_state VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ,
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, SUPPRESSED, DELIVERED, EXPIRED, FAILED
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_dedupe UNIQUE (dedupe_key)
);
