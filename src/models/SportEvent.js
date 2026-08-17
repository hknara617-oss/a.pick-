'use strict';
/**
 * src/models/SportEvent.js
 * Sport-agnostic event model.
 */
class SportEvent {
    constructor({
        provider,
        roundId,
        eventId,
        sport,
        league,
        homeParticipant,
        awayParticipant,
        scheduledStart,
        status = 'SCHEDULED',
        sourceRefs = []
    }) {
        if (!eventId || !sport || !homeParticipant || !awayParticipant) {
            throw new Error('SportEvent requires eventId, sport, homeParticipant, awayParticipant');
        }
        this.provider = provider;
        this.roundId = roundId;
        this.eventId = eventId;
        this.sport = sport; // 'BASEBALL' | 'SOCCER' | 'BASKETBALL' | 'VOLLEYBALL' | etc.
        this.league = league;
        this.homeParticipant = homeParticipant; // { id, name, ... }
        this.awayParticipant = awayParticipant; // { id, name, ... }
        this.scheduledStart = scheduledStart; // ISO timestamp
        this.status = status; // 'SCHEDULED' | 'IN_PLAY' | 'FINAL' | 'CANCELLED' | 'POSTPONED'
        this.sourceRefs = sourceRefs;
        Object.freeze(this);
    }
}

module.exports = SportEvent;
