export class DiscordThreadContextResolverError extends Error {
    code;
    constructor(code, detail) {
        super(detail);
        this.name = "DiscordThreadContextResolverError";
        this.code = code;
    }
}
export class DefaultDiscordThreadContextResolver {
    async resolveThreadContext(event) {
        if (event.guildId === null) {
            return {
                canonicalChannelId: event.channelId,
                canonicalThreadId: null,
            };
        }
        const threadChannelId = normalizeOptionalString(event.threadId);
        if (!threadChannelId) {
            return {
                canonicalChannelId: event.channelId,
                canonicalThreadId: null,
            };
        }
        const parentChannelId = normalizeOptionalString(readPath(event.raw, ["parent_id"])) ??
            normalizeOptionalString(readPath(event.raw, ["channel", "parent_id"])) ??
            normalizeOptionalString(readPath(event.raw, ["thread", "parent_id"])) ??
            normalizeOptionalString(readPath(event.raw, ["message_reference", "channel_id"]));
        if (!parentChannelId) {
            throw new DiscordThreadContextResolverError("DISCORD_THREAD_PARENT_UNRESOLVED", "Unable to resolve Discord parent channel for thread-origin message.");
        }
        return {
            canonicalChannelId: parentChannelId,
            canonicalThreadId: threadChannelId,
        };
    }
}
const readPath = (value, path) => {
    let current = value;
    for (const key of path) {
        if (!isRecord(current)) {
            return undefined;
        }
        current = current[key];
    }
    return current;
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
//# sourceMappingURL=discord-thread-context-resolver.js.map