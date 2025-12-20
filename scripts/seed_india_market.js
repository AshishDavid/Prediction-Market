const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, writeBatch, query, where } = require('firebase/firestore');
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

async function seed() {
    console.log('Cleaning up old "India T20" markets...');

    // 1. Find Old Markets
    const marketsRef = collection(db, 'markets');
    const allMarkets = await getDocs(marketsRef);
    const targets = allMarkets.docs.filter(d =>
        d.data().question && d.data().question.includes('Will India win its next T20')
    );

    const batch = writeBatch(db);
    let deletedCount = 0;

    for (const mDoc of targets) {
        console.log(`Deleting old market: ${mDoc.id}`);
        // Delete predictions first
        const predsQ = query(collection(db, 'predictions'), where('market_id', '==', mDoc.id));
        const predsSnap = await getDocs(predsQ);
        predsSnap.forEach(p => batch.delete(p.ref));

        // Delete market
        batch.delete(mDoc.ref);
        deletedCount++;
    }

    if (deletedCount > 0) {
        await batch.commit();
        console.log(`Deleted ${deletedCount} old market(s) and their predictions.`);
    }

    console.log('Creation: Will India win its next T20 international match?');
    try {
        await addDoc(collection(db, 'markets'), {
            question: "Will India win its next T20 international match?",
            image: "https://flagcdn.com/w320/in.png",
            category: "Sports",
            close_time: "2026-01-31T18:29:59.000Z", // Fixed deadline
            yes_votes: 0,
            no_votes: 0,
            vote_count: 0,
            probability: 50,
            outcome: null,
            created_at: new Date()
        });
        console.log('✅ Market restored!');
    } catch (e) {
        console.error('❌ Failed:', e.message);
        console.log('HINT: Check firestore.rules. You might need to temporarily allow create: if true;');
    }
    process.exit(0);
}

seed();
