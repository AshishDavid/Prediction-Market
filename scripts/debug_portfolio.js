const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

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

async function debugPortfolio() {
    try {
        console.log("1. Fetching ANY prediction to see if data exists...");
        const allPreds = await getDocs(collection(db, 'predictions'));
        console.log(`   Found ${allPreds.size} total predictions.`);

        if (allPreds.empty) {
            console.log("   No predictions in DB. User hasn't voted?");
            return;
        }

        const sampleUserId = allPreds.docs[0].data().user_id;
        console.log(`2. Testing Portfolio Query for User: ${sampleUserId}`);

        const q = query(
            collection(db, 'predictions'),
            where('user_id', '==', sampleUserId),
            orderBy('updated_at', 'desc')
        );

        const snapshot = await getDocs(q);
        console.log(`   Query Success! Found ${snapshot.size} predictions for this user.`);

    } catch (e) {
        console.error("   Query FAILED:", e.message);
        if (e.code === 'failed-precondition') {
            console.log("   -> CONFIRMED: Missing Index.");
        }
    }
}

debugPortfolio();
