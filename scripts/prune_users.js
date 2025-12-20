const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, query, where } = require('firebase/firestore');
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

async function prune() {
    console.log('Scanning profiles...');
    const profilesSnap = await getDocs(collection(db, 'profiles'));

    // Safety Check: Ensure an admin exists
    const adminFound = profilesSnap.docs.some(d => d.data().is_admin === true);
    if (!adminFound) {
        console.error('CRITICAL: No admin profile found (is_admin: true). Aborting to prevent total wipeout.');
        console.log('Please login as admin first to set the flag.');
        process.exit(1);
    }

    let deletedCount = 0;
    for (const d of profilesSnap.docs) {
        const data = d.data();
        const id = d.id;

        if (data.is_admin === true) {
            console.log(`✅ KEEPING Admin: ${data.username} (${id})`);
            continue;
        }

        console.log(`🗑️ DELETING User: ${data.username} (${id})`);

        // 1. Delete Predictions
        const q = query(collection(db, 'predictions'), where('user_id', '==', id));
        const predsSnap = await getDocs(q);
        const delPreds = predsSnap.docs.map(p => deleteDoc(doc(db, 'predictions', p.id)));
        await Promise.all(delPreds);
        console.log(`   - Deleted ${predsSnap.size} predictions.`);

        // 2. Delete Profile
        await deleteDoc(doc(db, 'profiles', id));
        deletedCount++;
    }

    console.log(`\nPrune Complete. Deleted ${deletedCount} users.`);
    process.exit(0);
}

prune();
