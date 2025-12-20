const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } = require('firebase/firestore');
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

async function cleanup() {
    console.log('Scanning for orphan predictions (ghost votes)...');

    // 1. Get All Profiles (for quick lookup)
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    const userIds = new Set(profilesSnap.docs.map(d => d.id));
    console.log(`Loaded ${userIds.size} valid user profiles.`);

    // 2. Scan Predictions
    const predsSnap = await getDocs(collection(db, 'predictions'));
    console.log(`Scanning ${predsSnap.size} predictions...`);

    let deletedCount = 0;
    const deletePromises = [];

    for (const p of predsSnap.docs) {
        const data = p.data();
        if (!userIds.has(data.user_id)) {
            console.log(`🗑️ Found Orphan: Prediction ${p.id} (User: ${data.user_id})`);
            deletePromises.push(deleteDoc(doc(db, 'predictions', p.id)));
            deletedCount++;
        }
    }

    if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`✅ Deleted ${deletedCount} orphan predictions.`);
    } else {
        console.log('✅ No orphans found. Data is clean.');
    }

    process.exit(0);
}

cleanup();
