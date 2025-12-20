const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } = require('firebase/firestore');
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

async function fixReputation() {
    console.log('Starting Reputation Fix...');
    try {
        const usersRef = collection(db, 'profiles');
        const snap = await getDocs(usersRef);

        if (snap.empty) {
            console.log('No users found.');
            return;
        }

        let updated = 0;
        const batch = writeBatch(db);
        let batchCount = 0;

        snap.docs.forEach((d) => {
            const data = d.data();
            // Upgrading everyone below 1000 to 1000
            if (!data.reputation || data.reputation < 1000) {
                const docRef = doc(db, 'profiles', d.id);
                batch.update(docRef, { reputation: 1000 });
                updated++;
                batchCount++;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
            console.log(`Successfully upgraded ${updated} users to 1000 Reputation.`);
        } else {
            console.log('All users are already at or above 1000.');
        }

    } catch (e) {
        console.error('Error fixing reputation:', e);
    }
}

fixReputation().then(() => process.exit());
