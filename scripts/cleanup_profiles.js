const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function cleanupProfiles() {
    try {
        console.log("Fetching all profiles...");
        const profilesRef = collection(db, 'profiles');
        const snapshot = await getDocs(profilesRef);

        if (snapshot.empty) {
            console.log("No profiles found.");
            return;
        }

        console.log(`Found ${snapshot.size} profiles. Checking for non-admins...`);
        let deletedCount = 0;

        for (const userDoc of snapshot.docs) {
            const data = userDoc.data();
            const isAdmin = data.is_admin === true;

            if (!isAdmin) {
                console.log(`Deleting non-admin user: ${data.username} (${userDoc.id})`);
                await deleteDoc(doc(db, 'profiles', userDoc.id));
                deletedCount++;
            } else {
                console.log(`SKIPPING Admin: ${data.username} (${userDoc.id})`);
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} profiles.`);
    } catch (e) {
        console.error("Error cleaning up profiles:", e);
    }
}

cleanupProfiles();
