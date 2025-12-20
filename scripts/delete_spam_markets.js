const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');
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

const TARGETS = ["testing"];

async function deleteSpam() {
    console.log(`Searching for spam markets: ${TARGETS.join(', ')}...`);
    const marketsRef = collection(db, 'markets');

    // Firestore "in" query limited to 10, perfect for us
    const q = query(marketsRef, where('question', 'in', TARGETS));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('No spam markets found.');
        process.exit(0);
    }

    console.log(`Found ${snapshot.size} markets to delete.`);

    for (const d of snapshot.docs) {
        const id = d.id;
        const data = d.data();
        console.log(`Deleting: "${data.question}" (ID: ${id})`);

        // 1. Delete Market
        await deleteDoc(doc(db, 'markets', id));

        // 2. Delete Predictions for this market
        const predsQ = query(collection(db, 'predictions'), where('market_id', '==', id));
        const predsSnap = await getDocs(predsQ);
        const deletePromises = predsSnap.docs.map(p => deleteDoc(doc(db, 'predictions', p.id)));
        await Promise.all(deletePromises);
        console.log(`  - Deleted ${predsSnap.size} associated predictions.`);
    }

    console.log('Cleanup Complete.');
    process.exit(0);
}

deleteSpam();
