const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
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

async function cleanupDuplicateVotes() {
    try {
        console.log('Removing duplicate votes...');

        const predsRef = collection(db, 'predictions');
        const snapshot = await getDocs(predsRef);

        // Map of key (market_user) -> Array of Docs
        const grouped = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const key = `${data.market_id}_${data.user_id}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({ id: doc.id, ...data });
        });

        let deleteCount = 0;
        const promises = [];

        for (const key in grouped) {
            const group = grouped[key];
            if (group.length > 1) {
                // Sort by updated_at desc (keep newest)
                group.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

                // Keep index 0, delete the rest
                const toDelete = group.slice(1);
                toDelete.forEach(d => {
                    console.log(`Deleting duplicate prediction ${d.id} for ${key}`);
                    promises.push(deleteDoc(doc(db, 'predictions', d.id)));
                    deleteCount++;
                });
            }
        }

        await Promise.all(promises);
        console.log(`Cleanup complete. Deleted ${deleteCount} duplicate votes.`);
        process.exit(0);

    } catch (e) {
        console.error('Error cleaning duplicates:', e);
        process.exit(1);
    }
}

cleanupDuplicateVotes();
