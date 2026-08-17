import * as crypto from 'crypto';
import { IRepository } from '../repository/IRepository';
import { MarketObservation } from '../models/MarketObservation';
import { SelectionObservation } from '../models/SelectionObservation';
import { Market, MarketSelection } from '../repository/BetmanRepository';

export class MarketObservationWriter {
    constructor(private repository: IRepository) {}

    public async writeObservation(
        market: Market,
        selections: MarketSelection[],
        snapshotId: string,
        providerRoundId: string,
        rowHash: string,
        providerFetchedAt: string
    ): Promise<string> {
        const obsId = `OBS_${crypto.randomBytes(6).toString('hex')}`;
        
        const obs: MarketObservation = {
            id: obsId,
            provider: 'betman',
            roundId: providerRoundId,
            marketId: market.id,
            providerMarketId: market.providerMarketId,
            observedAt: new Date().toISOString(),
            providerFetchedAt,
            marketType: market.marketType,
            line: market.line ?? null,
            snapshotId,
            rowHash,
            parserVersion: 'v3'
        };

        const selObsList: SelectionObservation[] = selections.map(s => {
            const canonicalDecimal = (Math.round(s.odds * 100) / 100).toFixed(2);
            return {
                id: `SOBS_${crypto.randomBytes(6).toString('hex')}`,
                marketObservationId: obsId,
                selectionType: s.selectionType,
                providerLabel: s.providerLabel,
                oddsDecimal: canonicalDecimal,
                oddsRaw: s.odds,
                observedAt: obs.observedAt
            };
        });

        await this.repository.saveMarketObservation(obs);
        await this.repository.saveSelectionObservations(selObsList);

        return obsId;
    }
}
