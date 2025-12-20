const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc } = require('firebase/firestore');
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

async function investigate() {
    console.log('Searching for "India T20" market...');

    // 1. Find Market ID
    const marketsRef = collection(db, 'markets');
    // We'll filter in memory to be safe on exact string match or partial
    const allMarkets = await getDocs(marketsRef);
    const targetMarket = allMarkets.docs.find(d =>
        d.data().question.includes('India') && d.data().question.includes('T20')
    );

    if (!targetMarket) {
        console.log('Market not found.');
        process.exit(0);
    }

    const marketId = targetMarket.id;
    console.log(`Found Market: "${targetMarket.data().question}" (ID: ${marketId})`);

    // 2. Find Predictions
    const predsRef = collection(db, 'predictions');
    const q = query(predsRef, where('market_id', '==', marketId));
    const predsSnap = await getDocs(q);

    console.log(`Found ${predsSnap.size} votes.`);

    for (const p of predsSnap.docs) {
        const data = p.data();
        const userId = data.user_id;

        // 3. Get User Profile
        const userDoc = await getDoc(doc(db, 'profiles', userId));
        const username = userDoc.exists() ? userDoc.data().username : 'Unknown/Deleted';

        console.log(`- Vote: ${data.vote} | User: ${username} (ID: ${userId})`);
    }

    process.exit(0);
}

investigate();
