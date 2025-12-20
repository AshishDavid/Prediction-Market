const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

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

async function testQuery() {
    try {
        console.log("Testing Home Screen Query...");
        const marketsRef = collection(db, 'markets');
        const featQuery = query(
            marketsRef,
            where('outcome', '==', null),
            orderBy('created_at', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(featQuery);
        console.log("Query Success!");
        console.log("Docs found:", snapshot.size);
        snapshot.forEach(doc => {
            console.log(" - ", doc.id, doc.data().question);
        });
    } catch (e) {
        console.error("Query Failed:", e.message);
        if (e.code) console.error("Error Code:", e.code);
    }
}

testQuery();
