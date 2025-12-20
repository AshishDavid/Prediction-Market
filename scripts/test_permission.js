const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, getDoc } = require('firebase/firestore');
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

// NOTE: This script runs with ADMIN SDK privileges effectively because we use node client?
// Actually no, this runs with the JS SDK. It isn't authenticated as "admin@test.com".
// It is UN-AUTHENTICATED unless I sign in.
// Running this might fail if rules require auth.
// But earlier scripts managed to delete docs. So likely rules are OPEN.

async function testRepUpdate() {
    try {
        console.log('Testing reputation update...');
        const profilesRef = collection(db, 'profiles');
        const snap = await getDocs(profilesRef);

        if (snap.empty) {
            console.log('No profiles found to test.');
            process.exit(0);
        }

        const targetUser = snap.docs[0];
        console.log(`Targeting user: ${targetUser.id} (${targetUser.data().username})`);
        console.log(`Current Rep: ${targetUser.data().reputation}`);

        // Try to add 1
        await updateDoc(doc(db, 'profiles', targetUser.id), {
            reputation: (targetUser.data().reputation || 1000) + 1
        });
        console.log('Update SUCCEEDED! Rules seem open.');

        // Revert
        await updateDoc(doc(db, 'profiles', targetUser.id), {
            reputation: targetUser.data().reputation
        });
        console.log('Reverted changes.');
        process.exit(0);
    } catch (e) {
        console.error('Update FAILED:', e.message);
        if (e.code === 'permission-denied') {
            console.error('This confirms PERMISSIONS are blocking improper writes.');
        }
        process.exit(1);
    }
}

testRepUpdate();
