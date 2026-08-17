'use strict';

/**
 * src/services/BetaAccessService.js
 * Beta Access Control & Invite Verification Layer.
 * Prevents uninvited public users from accessing beta data.
 */
class BetaAccessService {
    constructor({ invites = [] } = {}) {
        this.invites = new Map();
        for (const inv of invites) {
            this.invites.set(inv.email.toLowerCase(), { ...inv });
        }
    }

    async addInvite({ email, inviteCode = null }) {
        const e = email.toLowerCase();
        const invite = {
            email: e,
            inviteCode: inviteCode || `BETA_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            status: 'INVITED',
            invitedAt: new Date().toISOString(),
            acceptedAt: null,
            revokedAt: null
        };
        this.invites.set(e, invite);
        return invite;
    }

    async verifyBetaAccess(email) {
        if (!email) {
            return { allowed: false, reason: 'EMAIL_REQUIRED', status: 'DENIED' };
        }

        const inv = this.invites.get(email.toLowerCase());
        if (!inv) {
            return {
                allowed: false,
                reason: 'UNINVITED_USER',
                status: 'DENIED',
                message: '초대된 베타 사용자만 접속할 수 있습니다.'
            };
        }

        if (inv.status === 'REVOKED') {
            return {
                allowed: false,
                reason: 'INVITE_REVOKED',
                status: 'REVOKED',
                message: '초대가 만료되거나 취소되었습니다.'
            };
        }

        return {
            allowed: true,
            status: inv.status,
            inviteCode: inv.inviteCode,
            email: inv.email
        };
    }

    async acceptInvite(email) {
        const check = await this.verifyBetaAccess(email);
        if (!check.allowed) return check;

        const inv = this.invites.get(email.toLowerCase());
        inv.status = 'ACCEPTED';
        inv.acceptedAt = new Date().toISOString();
        this.invites.set(email.toLowerCase(), inv);

        return { allowed: true, status: 'ACCEPTED', acceptedAt: inv.acceptedAt };
    }
}

module.exports = BetaAccessService;
