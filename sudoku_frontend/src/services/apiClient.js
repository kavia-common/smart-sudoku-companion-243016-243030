/**
 * @fileoverview Lightweight REST client for the Sudoku backend.
 * Uses REACT_APP_API_BASE or REACT_APP_BACKEND_URL for configuration.
 */

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Safely join base URL and path.
 * @param {string} baseUrl
 * @param {string} path
 * @return {string}
 */
function joinUrl(baseUrl, path) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    const p = String(path || '').replace(/^\/+/, '');
    if (!base) {
        return `/${p}`;
    }
    return `${base}/${p}`;
}

/**
 * Parse feature flags from REACT_APP_FEATURE_FLAGS (JSON).
 * @return {{[key: string]: any}}
 */
function parseFeatureFlags() {
    const raw = process.env.REACT_APP_FEATURE_FLAGS;
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (e) {
        // Ignore; treat as not configured.
    }
    return {};
}

/**
 * Get backend base URL from env.
 * @return {string}
 */
function getApiBaseUrl() {
    return process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '';
}

/**
 * Create an AbortController that times out.
 * @param {number} timeoutMs
 * @return {{controller: AbortController, timeoutId: number}}
 */
function createTimeoutAbort(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    return {controller, timeoutId};
}

/**
 * Perform a JSON request.
 * @param {string} method
 * @param {string} path
 * @param {?Object=} body
 * @param {{timeoutMs?: number}=} options
 * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
 */
async function requestJson(method, path, body, options) {
    const timeoutMs = (options && options.timeoutMs) || DEFAULT_TIMEOUT_MS;
    const {controller, timeoutId} = createTimeoutAbort(timeoutMs);

    const url = joinUrl(getApiBaseUrl(), path);

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        const contentType = res.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            data = text;
        }

        return {
            ok: res.ok,
            status: res.status,
            data,
            error: res.ok ? undefined : (data && data.error) || res.statusText,
        };
    } catch (e) {
        const message = e && e.name === 'AbortError' ? 'Request timed out' : (e && e.message) || 'Network error';
        return {ok: false, status: 0, data: null, error: message};
    } finally {
        window.clearTimeout(timeoutId);
    }
}

/**
 * Detect whether backend integration should be enabled via flags/env.
 * If base URL isn't present, backend is considered disabled.
 * @return {boolean}
 */
function isBackendEnabled() {
    const base = getApiBaseUrl();
    if (!base) {
        return false;
    }
    const flags = parseFeatureFlags();
    if (typeof flags.backendEnabled === 'boolean') {
        return flags.backendEnabled;
    }
    return true;
}

export const ApiClient = {
    /**
     * PUBLIC_INTERFACE
     * Backend capability check used by UI to show status and decide fallback behavior.
     * @return {boolean}
     */
    isBackendEnabled,

    /**
     * PUBLIC_INTERFACE
     * Request a new puzzle from backend. Expected response shape may vary; UI will normalize.
     * @param {string} difficulty
     * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
     */
    async getPuzzle(difficulty) {
        return requestJson('GET', `/api/puzzle?difficulty=${encodeURIComponent(difficulty)}`, null, {});
    },

    /**
     * PUBLIC_INTERFACE
     * Request a daily puzzle from backend.
     * @param {string} dateIso
     * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
     */
    async getDailyPuzzle(dateIso) {
        return requestJson('GET', `/api/daily?date=${encodeURIComponent(dateIso)}`, null, {});
    },

    /**
     * PUBLIC_INTERFACE
     * Validate a move or full board via backend.
     * @param {{grid: number[][], row?: number, col?: number, value?: number}} payload
     * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
     */
    async validate(payload) {
        return requestJson('POST', '/api/validate', payload, {});
    },

    /**
     * PUBLIC_INTERFACE
     * Request a hint. Backend may respond with position/value/explanation.
     * @param {{grid: number[][]}} payload
     * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
     */
    async getHint(payload) {
        return requestJson('POST', '/api/hint', payload, {});
    },

    /**
     * PUBLIC_INTERFACE
     * Submit completion stats. Optional endpoint.
     * @param {{difficulty: string, elapsedMs: number, mistakes: number, hintsUsed: number}} payload
     * @return {Promise<{ok: boolean, status: number, data: any, error: (string|undefined)}>}
     */
    async submitStats(payload) {
        return requestJson('POST', '/api/stats', payload, {});
    },
};
