const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');
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

async function fix() {
    console.log('Force Recalculating All Markets...');
    
    // 1. Get All Markets
    const marketsRef = collection(db, 'markets');
    const marketsSnap = await getDocs(marketsRef);
    const updates = [];

    // 2. Get All Predictions (In memory Aggregation)
    const predsSnap = await getDocs(collection(db, 'predictions'));
    const stats = {}; // { marketId: { yes: 0, no: 0 } }

    predsSnap.forEach(p => {
        const d = p.data();
        if (!stats[d.market_id]) stats[d.market_id] = { yes: 0, no: 0 };
        if (d.vote === 'YES') stats[d.market_id].yes++;
        else if (d.vote === 'NO') stats[d.market_id].no++;
    });

    // 3. Update Markets
    const batch = writeBatch(db);
    let count = 0;

    for (const mDoc of marketsSnap.docs) {
        const mId = mDoc.id;
        const current = mDoc.data();
        const s = stats[mId] || { yes: 0, no: 0 };
        const total = s.yes + s.no;
        const prob = total > 0 ? (s.yes / total) * 100 : 50;

        // Check if update needed
        if (current.yes_votes !== s.yes || current.no_votes !== s.no || current.probability !== prob) {
            console.log(`Fixing Market: "${current.question}"`);
            console.log(`- Old: Y:${current.yes_votes} N:${current.no_votes} P:${current.probability}`);
            console.log(`- New: Y:${s.yes} N:${s.no} P:${prob}`);
            
            batch.update(mDoc.ref, {
                yes_votes: s.yes,
                no_votes: s.no,
                vote_count: total,
                probability: prob,
                updated_at: new Date().toISOString() // Ensure standard JS Date string (or serverTimestamp if needed, but string consistent with other scripts)
            });
            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Updated ${count} markets.`);
    } else {
        console.log('✅ All markets are consistent.');
    }

    process.exit(0);
}

fix();
