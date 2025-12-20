const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
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

// Admin UID known from rules/previous context
const ADMIN_UID = "KYxtBiBJAkPzJ2RpjHMYd6TRML53";

async function resetRep() {
    console.log(`Resetting reputation for Admin (${ADMIN_UID})...`);
    try {
        const userRef = doc(db, 'profiles', ADMIN_UID);
        await updateDoc(userRef, {
            reputation: 1000
        });
        console.log('✅ Admin reputation reset to 1000.');
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
    process.exit(0);
}

resetRep();
