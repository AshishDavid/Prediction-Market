const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function list() {
    console.log('Listing ALL markets...');
    const snap = await getDocs(collection(db, 'markets'));

    const indiaMarkets = snap.docs.filter(d => d.data().question.includes('India'));

    if (indiaMarkets.length === 0) {
        console.log('❌ No "India" markets found in DB.');
    } else {
        indiaMarkets.forEach(d => {
            const m = d.data();
            console.log(`\nFound ID: ${d.id}`);
            console.log(`Question: ${m.question}`);
            console.log(`Category: ${m.category}`);
            console.log(`Outcome: ${m.outcome} (Type: ${typeof m.outcome})`);
            console.log(`Close Time: ${m.close_time}`);
            console.log(`Created At:`, m.created_at);
        });
    }
    process.exit(0);
}

list();
