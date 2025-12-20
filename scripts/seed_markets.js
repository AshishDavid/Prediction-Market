const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MARKETS = [
    {
        "category": "Macroeconomics",
        "question": "Will India’s CPI inflation be below 5% in the next official release?",
        "deadline": "2026-01-12T10:30:00+05:30"
    },
    {
        "category": "Macroeconomics",
        "question": "Will the RBI keep the repo rate unchanged at its next policy meeting?",
        "deadline": "2026-02-06T11:00:00+05:30"
    },
    {
        "category": "Stock Market",
        "question": "Will the Nifty 50 close above 22,500 at the end of this quarter?",
        "deadline": "2026-03-31T15:30:00+05:30"
    },
    {
        "category": "Technology",
        "question": "Will Apple announce a new iPhone model in India before December 31, 2025?",
        "deadline": "2025-12-31T12:00:00+05:30"
    },
    {
        "category": "Cryptocurrency",
        "question": "Will Bitcoin trade above $80,000 at any time before the end of this year?",
        "deadline": "2025-12-31T23:59:59+05:30"
    },
    {
        "category": "Stock Market",
        "question": "Will Reliance Industries report quarterly revenue above analyst expectations?",
        "deadline": "2026-07-30T16:00:00+05:30"
    },
    {
        "category": "Technology",
        "question": "Will Jio launch a new 5G plan within the next three months?",
        "deadline": "2026-03-31T12:00:00+05:30"
    },
    {
        "category": "Cryptocurrency",
        "question": "Will Ethereum exceed $6,000 before the end of this year?",
        "deadline": "2025-12-31T23:59:59+05:30"
    },
    {
        "category": "Politics",
        "question": "Will the Union Budget include a major tax reform this year?",
        "deadline": "2026-02-01T12:00:00+05:30"
    },
    {
        "category": "Sports",
        "question": "Will India win its next T20 international match?",
        "deadline": "2026-01-31T23:59:59+05:30"
    }
];

async function seedMarkets() {
    console.log(`Seeding ${MARKETS.length} markets...`);
    const colRef = collection(db, 'markets');

    for (const m of MARKETS) {
        try {
            // Check formatted date
            const closeDate = new Date(m.deadline);

            await addDoc(colRef, {
                question: m.question,
                category: m.category,
                close_time: closeDate.toISOString(),
                created_at: new Date().toISOString(),
                description: "Official Market",
                outcome: null,
                probability: 50,
                vote_count: 0
            });
            console.log(`Added: ${m.question}`);
        } catch (e) {
            console.error(`Failed to add ${m.question}:`, e);
        }
    }
    console.log('Seeding Complete.');
    process.exit(0);
}

seedMarkets();
