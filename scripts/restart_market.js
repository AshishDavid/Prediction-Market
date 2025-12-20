const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } = require('firebase/firestore');
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

async function restartMarket() {
    console.log('Searching for "India T20" market...');

    // 1. Find Market
    const marketsRef = collection(db, 'markets');
    const allMarkets = await getDocs(marketsRef);
    const targetMarket = allMarkets.docs.find(d =>
        d.data().question.includes('India') && d.data().question.includes('T20')
    );

    if (!targetMarket) {
        console.log('Market not found.');
        process.exit(1);
    }

    const marketId = targetMarket.id;
    console.log(`Found Market: "${targetMarket.data().question}" (ID: ${marketId})`);
    console.log(`Current Deadline: ${targetMarket.data().close_time}`);

    // 2. Reset Market Stats
    console.log('Resetting market stats...');
    // We use field path 'outcome' and set it to null (or delete it if needed, but null is fine for 'unresolved')
    // Actually, updateDoc with value `null` sets it to null.

    await updateDoc(targetMarket.ref, {
        yes_votes: 0,
        no_votes: 0,
        vote_count: 0,
        probability: 50,
        outcome: null, // Un-resolve
        updated_at: new Date().toISOString()
    });

    // 3. Delete Predictions
    console.log('Deleting associated predictions...');
    const predsRef = collection(db, 'predictions');
    const q = query(predsRef, where('market_id', '==', marketId));
    const predsSnap = await getDocs(q);

    console.log(`Found ${predsSnap.size} predictions to delete.`);

    if (predsSnap.size > 0) {
        const batch = writeBatch(db);
        predsSnap.forEach(p => {
            batch.delete(p.ref);
        });
        await batch.commit();
        console.log('Predictions deleted.');
    }

    console.log('✅ Market restarted successfully.');
    process.exit(0);
}

restartMarket();
