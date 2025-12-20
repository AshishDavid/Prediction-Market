const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

// Use the email admin@test.com to find the UID first, then query predictions.
// Or effectively just list ALL predictions and group by user+market to find collisions.
// Since I don't know the Admin UID offhand (it's in Auth), I'll just list all predictions 
// and flag any duplicates (same market_id AND same user_id).

async function findDuplicateVotes() {
    try {
        console.log('Scanning for duplicate votes (Same User + Same Market)...');

        const predsRef = collection(db, 'predictions');
        const snapshot = await getDocs(predsRef);
        console.log(`Total Predictions scanned: ${snapshot.size}`);

        const seen = new Map(); // Key: marketId_userId, Value: count
        const duplicates = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const key = `${data.market_id}_${data.user_id}`;

            if (seen.has(key)) {
                duplicates.push({ id: doc.id, key, ...data });
            } else {
                seen.set(key, doc.id);
            }
        });

        console.log(`Found ${duplicates.length} duplicate predictions.`);
        duplicates.forEach(d => {
            console.log(`Duplicate: User ${d.user_id} on Market ${d.market_id} (Vote: ${d.vote})`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

findDuplicateVotes();
