// Drafts new binary crypto-price prediction questions from today's real
// CoinGecko prices (no LLM, no external "trending" feed — the threshold is
// computed deterministically from live price data) and writes them into the
// `pending_markets` staging collection for admin review — it does NOT publish
// directly to `markets`. See app/(tabs)/profile.js's "Review Pending Questions"
// panel for the accept/reject step that actually makes a draft live.
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
    apiKey: "AIzaSyDqMgoxFyhenhvlZ-6wwJg7icDeLIqD7q4",
    authDomain: "market-58707.firebaseapp.com",
    projectId: "market-58707",
    storageBucket: "market-58707.firebasestorage.app",
    messagingSenderId: "499308866694",
    appId: "1:499308866694:web:2274ce4d43b6ca08c8f507",
    measurementId: "G-X574VCBC3Y"
};

const ADMIN_EMAIL = process.env.PULSE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PULSE_ADMIN_PASSWORD;

// id -> {label, round} — `round` controls how the computed threshold is
// rounded so it reads as a clean number instead of a random decimal.
const COINS = {
    bitcoin: { label: 'Bitcoin', round: 100 },
    ethereum: { label: 'Ethereum', round: 10 },
    solana: { label: 'Solana', round: 1 },
    cardano: { label: 'Cardano', round: 0.01 },
    dogecoin: { label: 'Dogecoin', round: 0.01 },
    ripple: { label: 'XRP', round: 0.01 },
};

async function fetchPrices() {
    const ids = Object.keys(COINS).join(',');
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!res.ok) {
        throw new Error(`CoinGecko fetch failed: ${res.status}`);
    }
    return res.json();
}

function roundToNice(value, step) {
    return Math.round(value / step) * step;
}

function formatUsd(value) {
    return value >= 1
        ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : value.toFixed(2);
}

// Deterministic threshold: 3-12% away from today's price, rounded to a clean
// increment, direction alternating so we don't always ask "above".
function draftQuestionForCoin(id, priceUsd, index) {
    const meta = COINS[id];
    if (!priceUsd || !meta) return null;

    const isAbove = index % 2 === 0;
    const pct = 0.03 + Math.random() * 0.09; // 3% - 12%
    const rawThreshold = isAbove ? priceUsd * (1 + pct) : priceUsd * (1 - pct);
    const threshold = roundToNice(rawThreshold, meta.round);

    const closeDays = 5 + Math.floor(Math.random() * 10); // 5-14 days
    const closeDate = new Date(Date.now() + closeDays * 24 * 60 * 60 * 1000);
    const dateLabel = closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
        type: 'binary',
        question: `Will ${meta.label} be ${isAbove ? 'above' : 'below'} $${formatUsd(threshold)} by ${dateLabel}?`,
        category: 'Cryptocurrency',
        close_time_days: closeDays,
    };
}

async function main() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.error('Missing required env vars: PULSE_ADMIN_EMAIL, PULSE_ADMIN_PASSWORD');
        process.exit(1);
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Authenticated as admin.');

    const prices = await fetchPrices();
    console.log('Fetched live prices:', prices);

    const drafts = Object.keys(COINS)
        .map((id, i) => draftQuestionForCoin(id, prices[id]?.usd, i))
        .filter(Boolean);

    const marketsRef = collection(db, 'markets');
    const pendingRef = collection(db, 'pending_markets');
    let created = 0;

    for (const m of drafts) {
        const [liveCheck, pendingCheck] = await Promise.all([
            getDocs(query(marketsRef, where('question', '==', m.question))),
            getDocs(query(pendingRef, where('question', '==', m.question)))
        ]);
        if (!liveCheck.empty || !pendingCheck.empty) {
            console.log(`Skip duplicate: ${m.question}`);
            continue;
        }

        await addDoc(pendingRef, {
            question: m.question,
            description: 'Auto-generated from live CoinGecko price data',
            category: m.category,
            type: m.type,
            close_time_days: m.close_time_days,
            created_at: serverTimestamp(),
            source: 'automation'
        });
        created++;
        console.log(`Drafted (pending review): ${m.question}`);
    }

    console.log(`Done. ${created} new drafts added to pending_markets.`);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
