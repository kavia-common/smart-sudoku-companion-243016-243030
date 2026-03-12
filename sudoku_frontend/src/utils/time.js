/**
 * @fileoverview Time helpers.
 */

/**
 * PUBLIC_INTERFACE
 * Format milliseconds into mm:ss or hh:mm:ss.
 * @param {number} ms
 * @return {string}
 */
function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    if (hours > 0) {
        return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    }
    return `${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * PUBLIC_INTERFACE
 * Read prefers-reduced-motion.
 * @return {boolean}
 */
function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export const Time = {
    formatDuration,
    prefersReducedMotion,
};
