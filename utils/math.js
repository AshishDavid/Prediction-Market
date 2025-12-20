/**
 * General math utilities.
 */

// Placeholder for now as user instructions put core logic in reputation.js
export const round = (num, decimals = 2) => {
    return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
};
