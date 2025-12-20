const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } = require('firebase/firestore');
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

async function cleanupDuplicates() {
    try {
        console.log('Finding duplicate markets...');
        const marketsRef = collection(db, 'markets');
        // Get all markets sorted by creation time (Oldest first)
        // If 'created_at' index is missing, we fetch all and sort manually.
        const q = query(marketsRef); // Fetch all to be safe about index absence
        const snapshot = await getDocs(q);

        const allMarkets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort by created_at ascending
        allMarkets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const seenQuestions = new Set();
        const duplicates = [];

        for (const market of allMarkets) {
            const key = market.question.trim().toLowerCase();
            if (seenQuestions.has(key)) {
                duplicates.push(market);
            } else {
                seenQuestions.add(key);
            }
        }

        console.log(`Found ${duplicates.length} duplicates to delete.`);

        if (duplicates.length > 0) {
            const deletePromises = duplicates.map(d => {
                console.log(`Deleting duplicate: "${d.question}" (ID: ${d.id})`);
                return deleteDoc(doc(db, 'markets', d.id));
            });
            await Promise.all(deletePromises);
            console.log('Cleanup complete.');
        } else {
            console.log('No duplicates found.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Error cleaning duplicates:', e);
        process.exit(1);
    }
}

cleanupDuplicates();
