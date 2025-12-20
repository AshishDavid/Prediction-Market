const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
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

async function check() {
    console.log('Checking "India T20" market stats...');

    const marketsRef = collection(db, 'markets');
    const allMarkets = await getDocs(marketsRef);
    const targetMarket = allMarkets.docs.find(d =>
        d.data().question.includes('India') && d.data().question.includes('T20')
    );

    if (!targetMarket) {
        console.log('Market not found.');
        process.exit(0);
    }

    const m = targetMarket.data();
    console.log('Market Data:');
    console.log(`- Question: ${m.question}`);
    console.log(`- ID: ${targetMarket.id}`);
    console.log(`- YES Votes: ${m.yes_votes}`);
    console.log(`- NO Votes: ${m.no_votes}`);
    console.log(`- Total Votes: ${m.vote_count}`);
    console.log(`- Probability: ${m.probability}`);

    console.log('---');

    // Check for remaining predictions
    const { collection: col, query: q, where: w, getDocs: gd } = require('firebase/firestore');
    const predsRef = col(db, 'predictions');
    const qSnap = await gd(q(predsRef, w('market_id', '==', targetMarket.id)));

    console.log(`Remaining Predictions: ${qSnap.size}`);
    qSnap.forEach(p => {
        console.log(`- User: ${p.data().user_id} | Vote: ${p.data().vote}`);
    });

    process.exit(0);
}

check();
