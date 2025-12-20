const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');
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

async function listMarkets() {
    try {
        console.log('Listing all markets...');
        const marketsRef = collection(db, 'markets');
        const snapshot = await getDocs(marketsRef);

        if (snapshot.empty) {
            console.log('No markets found.');
            process.exit(0);
        }

        const markets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        console.log(`Total Markets in DB: ${markets.length}`);

        markets.forEach((m, index) => {
            console.log(`\n[${index + 1}] ID: ${m.id}`);
            console.log(`    Question: "${m.question}"`);
            console.log(`    Outcome: ${m.outcome} (Active? ${m.outcome === null})`);
            console.log(`    Created: ${m.created_at}`);
            console.log(`    Category: ${m.category}`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error listing markets:', e);
        process.exit(1);
    }
}

listMarkets();
