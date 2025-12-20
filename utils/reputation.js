/**
 * Calculates the Brier Score for a prediction.
 * Lower is better (0 = perfect, 1 = completely wrong).
 * @param {number} prob - The predicted probability (0-100).
 * @param {boolean} outcome - The actual outcome (true for occurred/yes, false for did not occur/no).
 * @returns {number} - The Brier score (0 to 1).
 */
export function brierScore(prob, outcome) {
    const p = prob / 100;
    // If outcome is true (1), we want p to be close to 1. (1 - p)^2
    // If outcome is false (0), we want p to be close to 0. (0 - p)^2
    // The user's formula: 1 - Math.pow(p - outcome, 2) seems to be REVERSE Brier score (Higher is better)?
    // Standard Brier: (p - outcome)^2. Lower is better.
    // User Formula: 1 - (p - outcome)^2. Result 1 if perfect, 0 if worst.
    // We will Use USER'S FORMULA strictly.
    const outcomeVal = outcome ? 1 : 0;
    return 1 - Math.pow(p - outcomeVal, 2);
}

export function calculateNewReputation(oldReputation, brierScoreVal) {
    // new_reputation = old_reputation * 0.9 + brierScore * 10
    return (oldReputation * 0.9) + (brierScoreVal * 10);
}

export const RANKS = [
    'Initiate', 'Novice', 'Neophyte', 'Beginner', 'Learner', 'Student', 'Apprentice', 'Probationer', 'Tenderfoot', 'Rookie',
    'Observer', 'Scout', 'Watcher', 'Surveyor', 'Analyst', 'Senior Analyst', 'Chief Analyst', 'Predictor', 'Forecaster', 'Speculator',
    'Trader', 'Broker', 'Merchant', 'Investor', 'Capitalist', 'Strategist', 'Tactician', 'Planner', 'Architect', 'Mastermind',
    'Expert', 'Specialist', 'Authority', 'Pundit', 'Svengali', 'Sage', 'Guru', 'Seer', 'Diviner', 'Oracle',
    'Prophet', 'Visionary', 'Luminary', 'Grandmaster', 'Legend', 'Mythic', 'Immortal', 'Demigod', 'Titan', 'God of Markets'
];

export function getRankName(reputation) {
    if (reputation < 1000) return RANKS[0];

    const index = Math.floor((reputation - 1000) / 25);

    if (index >= RANKS.length) return RANKS[RANKS.length - 1];
    return RANKS[Math.max(0, index)];
}
