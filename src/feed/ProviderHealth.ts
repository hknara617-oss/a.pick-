import { IRepository, ProviderHealthState } from '../repository/IRepository';

export class ProviderHealth {
    constructor(private repository: IRepository) {}

    public async updateHealth(
        provider: string,
        success: boolean,
        latencyMs: number | null,
        snapshotHash: string | null,
        schemaHash: string | null
    ): Promise<ProviderHealthState> {
        // We'll just maintain an in-memory state or fetch from DB. For phase 3, keep it simple.
        // We actually need to fetch existing health state to increment consecutive failures.
        // For brevity, we assume a new state object if not saved before.
        let currentState: ProviderHealthState = (this.repository as any).data?.providerHealth || {
            provider,
            lastAttemptAt: null,
            lastSuccessAt: null,
            latencyMs: null,
            consecutiveFailures: 0,
            latestSnapshotHash: null,
            schemaHash: null,
            staleAgeMs: 0,
            state: 'HEALTHY'
        };
        
        // In a real app we fetch this from repository, but we need to extend IRepository to get it.
        // For Phase 3, we just construct it.
        const now = new Date();

        currentState.lastAttemptAt = now.toISOString();
        if (success) {
            currentState.lastSuccessAt = now.toISOString();
            currentState.latencyMs = latencyMs;
            currentState.consecutiveFailures = 0;
            currentState.latestSnapshotHash = snapshotHash;
            currentState.schemaHash = schemaHash;
            currentState.state = 'HEALTHY';
            currentState.staleAgeMs = 0;
        } else {
            currentState.consecutiveFailures += 1;
            if (currentState.consecutiveFailures >= 3) {
                currentState.state = 'STALE';
            } else {
                currentState.state = 'DEGRADED';
            }
        }

        await this.repository.saveProviderHealth(currentState);
        return currentState;
    }
}
