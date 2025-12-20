const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
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

async function createActiveMarket() {
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const marketData = {
            question: "Will this active market resolve correctly?",
            description: "Test market created via script for debugging.",
            category: "Tech",
            outcome: null,
            created_at: now.toISOString(),
            close_time: tomorrow.toISOString(),
            vote_count: 0
        };

        const docRef = await addDoc(collection(db, "markets"), marketData);
        console.log("Active Market Created with ID: ", docRef.id);
        console.log("Close Time: ", marketData.close_time);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

createActiveMarket();
