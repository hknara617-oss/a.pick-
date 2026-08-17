'use strict';

/**
 * src/services/NotificationInboxService.js
 * In-app Notification Inbox with strict idempotency and deduplication.
 */
class NotificationInboxService {
    constructor() {
        this.inbox = new Map(); // key: `${userId}:${dedupeKey}`
    }

    async addNotification({ userId, decisionId, title, body, severity = 'MEDIUM', dedupeKey }) {
        if (!userId || !decisionId || !title || !dedupeKey) {
            throw new Error('NotificationInboxService requires userId, decisionId, title, dedupeKey');
        }

        const key = `${userId}:${dedupeKey}`;
        if (this.inbox.has(key)) {
            // Return existing item (idempotent, no duplicate creation)
            return {
                item: this.inbox.get(key),
                created: false,
                message: 'DUPLICATE_IGNORED'
            };
        }

        const item = {
            id: `notif_${Math.random().toString(36).slice(2, 10)}`,
            userId,
            decisionId,
            title,
            body,
            severity,
            dedupeKey,
            createdAt: new Date().toISOString(),
            readAt: null
        };

        this.inbox.set(key, item);
        return { item, created: true };
    }

    async getUserInbox(userId, { unreadOnly = false } = {}) {
        const userItems = [];
        for (const [k, item] of this.inbox.entries()) {
            if (item.userId === userId) {
                if (unreadOnly && item.readAt !== null) continue;
                userItems.push(item);
            }
        }
        return userItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async markAsRead(userId, notificationId) {
        for (const [k, item] of this.inbox.entries()) {
            if (item.userId === userId && item.id === notificationId) {
                item.readAt = new Date().toISOString();
                this.inbox.set(k, item);
                return item;
            }
        }
        return null;
    }
}

module.exports = NotificationInboxService;
