/**
 * @fileoverview Local persistence helpers for saves and stats.
 */

const SAVE_KEY = 'ssc.save.v1';
const STATS_KEY = 'ssc.stats.v1';
const SETTINGS_KEY = 'ssc.settings.v1';

/**
 * Safe JSON parse.
 * @param {string} raw
 * @return {any}
 */
function safeJsonParse(raw) {
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

/**
 * PUBLIC_INTERFACE
 * Load persisted settings.
 * @return {{theme: string, accent: string, noteMode: boolean}}
 */
function loadSettings() {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return {
        theme: (parsed && parsed.theme) || 'retro',
        accent: (parsed && parsed.accent) || 'softgray',
        noteMode: Boolean(parsed && parsed.noteMode),
    };
}

/**
 * PUBLIC_INTERFACE
 * Save settings.
 * @param {{theme: string, accent: string, noteMode: boolean}} settings
 */
function saveSettings(settings) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * PUBLIC_INTERFACE
 * Save a game snapshot.
 * @param {Object} save
 */
function saveGame(save) {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

/**
 * PUBLIC_INTERFACE
 * Load a game snapshot or null.
 * @return {?Object}
 */
function loadGame() {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return safeJsonParse(raw);
}

/**
 * PUBLIC_INTERFACE
 * Clear saved game.
 */
function clearSavedGame() {
    window.localStorage.removeItem(SAVE_KEY);
}

/**
 * PUBLIC_INTERFACE
 * Load stats object.
 * @return {{
 *   bestTimesMs: {[difficulty: string]: number},
 *   gamesPlayed: number,
 *   gamesWon: number,
 *   currentStreak: number,
 *   bestStreak: number,
 * }}
 */
function loadStats() {
    const raw = window.localStorage.getItem(STATS_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return {
        bestTimesMs: (parsed && parsed.bestTimesMs) || {},
        gamesPlayed: (parsed && parsed.gamesPlayed) || 0,
        gamesWon: (parsed && parsed.gamesWon) || 0,
        currentStreak: (parsed && parsed.currentStreak) || 0,
        bestStreak: (parsed && parsed.bestStreak) || 0,
    };
}

/**
 * PUBLIC_INTERFACE
 * Save stats object.
 * @param {Object} stats
 */
function saveStats(stats) {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export const Storage = {
    loadSettings,
    saveSettings,
    saveGame,
    loadGame,
    clearSavedGame,
    loadStats,
    saveStats,
};
