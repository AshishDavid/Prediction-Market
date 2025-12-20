const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, getDoc } = require('firebase/firestore');
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

async function cleanupOrphans() {
    try {
        console.log('Finding orphaned predictions...');

        // 1. Get all Markets IDs
        const marketsRef = collection(db, 'markets');
        const marketsSnap = await getDocs(marketsRef);
        const validMarketIds = new Set(marketsSnap.docs.map(d => d.id));
        console.log(`Valid Market IDs (${validMarketIds.size}):`, [...validMarketIds]);

        // 2. Get all Predictions
        const predsRef = collection(db, 'predictions');
        const predsSnap = await getDocs(predsRef);
        console.log(`Total Predictions: ${predsSnap.size}`);

        const orphans = [];
        predsSnap.forEach(d => {
            const data = d.data();
            if (!validMarketIds.has(data.market_id)) {
                orphans.push(d);
            }
        });

        console.log(`Found ${orphans.length} orphaned predictions.`);

        if (orphans.length > 0) {
            const deletePromises = orphans.map(d => {
                console.log(`Deleting orphan prediction ${d.id} (Market ID: ${d.data().market_id})`);
                return deleteDoc(doc(db, 'predictions', d.id));
            });
            await Promise.all(deletePromises);
            console.log('Cleanup complete.');
        } else {
            console.log('No orphans found.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Error cleaning orphans:', e);
        process.exit(1);
    }
}

cleanupOrphans();
