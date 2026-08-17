-- migrations/005_indexes.sql
-- Optimized indexes for verified query access patterns

-- 1. Decision Contracts: by user and timestamp
CREATE INDEX IF NOT EXISTS idx_decision_contracts_user_created ON decision_contracts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_contracts_market ON decision_contracts(provider, round_id, market_id);
CREATE INDEX IF NOT EXISTS idx_decision_contracts_status ON decision_contracts(status);

-- 2. Decision Events: by decision sequence for fast audit replay
CREATE INDEX IF NOT EXISTS idx_decision_events_decision_seq ON decision_events(decision_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS idx_decision_events_hash ON decision_events(event_hash);

-- 3. Watch Targets: active watches and expiration lookups
CREATE INDEX IF NOT EXISTS idx_watch_targets_active_expires ON watch_targets(status, expires_at) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_watch_targets_decision ON watch_targets(decision_id);

-- 4. Market Observations: upstream time-series lookup
CREATE INDEX IF NOT EXISTS idx_market_observations_lookup ON market_observations(provider, round_id, market_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_observations_event ON market_observations(event_id, observed_at DESC);

-- 5. Selection Observations
CREATE INDEX IF NOT EXISTS idx_selection_observations_market_obs ON selection_observations(market_observation_id);

-- 6. Context Snapshots: lookup by event and recency
CREATE INDEX IF NOT EXISTS idx_context_snapshots_event_time ON context_snapshots(event_id, observed_at DESC);

-- 7. Watch Evaluations: chronological history per decision
CREATE INDEX IF NOT EXISTS idx_watch_evaluations_decision_time ON watch_evaluations(decision_id, evaluated_at DESC);

-- 8. Notification Candidates: delivery worker queue
CREATE INDEX IF NOT EXISTS idx_notification_candidates_delivery ON notification_candidates(delivery_status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notification_candidates_decision ON notification_candidates(decision_id, created_at DESC);

-- 9. Sport Events: schedule querying
CREATE INDEX IF NOT EXISTS idx_sport_events_scheduled_start ON sport_events(scheduled_start ASC);
CREATE INDEX IF NOT EXISTS idx_sport_events_provider_round ON sport_events(provider, round_id);
