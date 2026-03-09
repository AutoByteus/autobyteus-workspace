export type DiscordPeerTarget = {
    targetType: "USER";
    id: string;
} | {
    targetType: "CHANNEL";
    id: string;
};
export declare class DiscordTargetCodecError extends Error {
    readonly code: "INVALID_DISCORD_PEER_ID";
    readonly retryable = false;
    constructor(detail: string);
}
export declare function encodeDiscordPeerId(target: DiscordPeerTarget): string;
export declare function decodeDiscordPeerId(peerId: string): DiscordPeerTarget;
//# sourceMappingURL=discord-target-codec.d.ts.map