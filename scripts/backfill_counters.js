const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');
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

async function backfill() {
    console.log('Backfilling vote counters...');
    const marketsRef = collection(db, 'markets');
    const marketsSnap = await getDocs(marketsRef);

    for (const mDoc of marketsSnap.docs) {
        const id = mDoc.id;
        const q = query(collection(db, 'predictions'), where('market_id', '==', id));
        const predsSnap = await getDocs(q);

        let yes = 0;
        let no = 0;
        predsSnap.forEach(p => {
            if (p.data().vote === 'YES') yes++;
            else if (p.data().vote === 'NO') no++;
        });

        console.log(`Market ${id}: ${yes} YES, ${no} NO`);

        await updateDoc(doc(db, 'markets', id), {
            yes_votes: yes,
            no_votes: no,
            vote_count: yes + no
        });
    }
    console.log('Done.');
    process.exit(0);
}

backfill();
