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

async function wipeAllData() {
    try {
        console.log('Starting wipe of events (Markets & Predictions)...');

        // 1. Delete all Predictions (Children of markets, logically)
        const predsRef = collection(db, 'predictions');
        const predsSnap = await getDocs(predsRef);
        console.log(`Found ${predsSnap.size} predictions to delete.`);

        const predDeletePromises = predsSnap.docs.map(d => deleteDoc(doc(db, 'predictions', d.id)));
        await Promise.all(predDeletePromises);
        console.log('All predictions deleted.');

        // 2. Delete all Markets
        const marketsRef = collection(db, 'markets');
        const marketsSnap = await getDocs(marketsRef);
        console.log(`Found ${marketsSnap.size} markets to delete.`);

        const marketDeletePromises = marketsSnap.docs.map(d => deleteDoc(doc(db, 'markets', d.id)));
        await Promise.all(marketDeletePromises);
        console.log('All markets deleted.');

        console.log('WIPE COMPLETE. All events are gone.');
        process.exit(0);
    } catch (e) {
        console.error('Error wiping data:', e);
        process.exit(1);
    }
}

wipeAllData();
