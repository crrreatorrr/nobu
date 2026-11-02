/** Same-origin Nakama. Ticket redeem is custom auth; every RPC sends the session token. */
export declare const LOCAL_NAKAMA: {
    readonly serverUrl: "http://127.0.0.1:7350";
};
export interface NakamaRpcOptions {
    token?: string;
    keepalive?: boolean;
}
export interface NakamaClient {
    authenticateCustom(id: string, vars?: Record<string, string>): Promise<{
        token: string;
        userId: string;
    }>;
    rpc<T>(id: string, body: object, opts?: NakamaRpcOptions): Promise<T>;
}
export interface NakamaClientOptions {
    serverUrl: string;
    fetchImpl?: typeof fetch;
}
export interface ProfileResult {
    playerId: string;
    relics: string[];
    gameBeaten: string[];
    scope: string;
    verse?: number;
    verseEarned?: {
        gameId: string;
        lifetime: number;
    }[];
    /** Remaining Tickets this game can still earn today. Present on a game session. */
    ticketsCapLeft?: number;
    /** Nakama server clock, epoch milliseconds. */
    serverTime?: number;
}
export interface PortalEnterResult {
    ticket: string;
    sessionId: string;
    expiresAt: number;
    /** Nakama server clock, epoch milliseconds. */
    serverTime: number;
}
export interface RedeemResult {
    token: string;
    playerId: string;
    ranked: boolean;
    sid: string;
    relics: string[];
    effects: Record<string, number | boolean | string>;
    ticketsCapLeft: number;
    gameBeaten: string[];
    /** Nakama server clock, epoch milliseconds. */
    serverTime: number;
}
export interface RecoveryCodeResult {
    code: string;
}
export interface RecoveryRedeemResult {
    restored: boolean;
    userId: string;
    token: string;
}
export declare function userIdFromToken(token: string): string;
export declare function createNakamaClient(options: NakamaClientOptions): NakamaClient;
