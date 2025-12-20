import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";

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
        console.log("Attempting to query 'markets' with filter...");
        const q = query(
            collection(db, 'markets'),
            where('outcome', '==', null),
            orderBy('created_at', 'desc')
        );
        const snapshot = await getDocs(q);
        console.log(`Success! Found ${snapshot.size} markets.`);
        snapshot.forEach(doc => console.log(doc.id, doc.data().question));
    } catch (e) {
        console.error("Query failed!");
        console.error(e.message);
        if (e.message.includes("index")) {
            console.log("\n>>> YOU NEED TO CREATE AN INDEX. LOOK FOR THE LINK IN THE ERROR ABOVE <<<");
        }
    }
}

testQuery();
