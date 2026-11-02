import { HubSdkError } from './errors';
import { base64UrlToBytes } from './ticket';
/** Same-origin Nakama. Ticket redeem is custom auth; every RPC sends the session token. */
export const LOCAL_NAKAMA = {
    serverUrl: 'http://127.0.0.1:7350',
};
export function userIdFromToken(token) {
    const part = token.split('.')[1];
    if (!part)
        throw new HubSdkError('bad_token', 'Session token is missing a payload');
    try {
        const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
        if (!json.uid)
            throw new HubSdkError('bad_token', 'Session token has no user id');
        return json.uid;
    }
    catch (error) {
        if (error instanceof HubSdkError)
            throw error;
        throw new HubSdkError('bad_token', 'Session token payload is not valid');
    }
}
export function createNakamaClient(options) {
    const serverUrl = options.serverUrl.replace(/\/$/, '');
    const fetchImpl = options.fetchImpl ?? fetch;
    return {
        /**
         * Redeem a portal ticket. `id` is `t:` plus the fragment ticket.
         * `create` stays false: the hub account already exists. Vars ride on
         * the custom account, which is what `beforeAuthenticateCustom` reads.
         */
        async authenticateCustom(id, vars) {
            const account = vars ? { id, vars } : { id };
            const response = await fetchImpl(`${serverUrl}/v2/account/authenticate/custom?create=false`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account, create: { value: false } }),
            });
            const text = await response.text();
            if (!response.ok)
                throw new HubSdkError('auth_failed', text || `HTTP ${response.status}`);
            const body = JSON.parse(text);
            if (!body.token)
                throw new HubSdkError('auth_failed', 'Custom auth did not return a token');
            return { token: body.token, userId: userIdFromToken(body.token) };
        },
        async rpc(id, body, opts) {
            const params = new URLSearchParams({ unwrap: 'true' });
            if (!opts?.token)
                throw new HubSdkError('unauthorized', 'Missing session');
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${opts.token}`,
            };
            const response = await fetchImpl(`${serverUrl}/v2/rpc/${encodeURIComponent(id)}?${params}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                keepalive: opts?.keepalive,
            });
            const text = await response.text();
            if (!response.ok)
                throw new HubSdkError('rpc_failed', text || `HTTP ${response.status}`, response.status);
            const parsed = (text ? JSON.parse(text) : {});
            if (parsed.error) {
                const num = (value) => (typeof value === 'number' ? value : undefined);
                const sessionCapLeft = num(parsed.sessionCapLeft);
                const dailyCapLeft = num(parsed.dailyCapLeft);
                const capLeft = num(parsed.capLeft) ?? sessionCapLeft ?? dailyCapLeft;
                throw new HubSdkError(parsed.error, parsed.message || parsed.error, undefined, capLeft, sessionCapLeft, dailyCapLeft);
            }
            return parsed;
        },
    };
}
