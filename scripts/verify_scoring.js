const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, addDoc } = require('firebase/firestore');

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

// Reputation Logic (Copied from utils/reputation.js)
function brierScore(prob, outcome) {
    const p = prob / 100;
    const outcomeVal = outcome ? 1 : 0;
    return 1 - Math.pow(p - outcomeVal, 2);
}

function calculateNewReputation(oldReputation, brierScoreVal) {
    return (oldReputation * 0.9) + (brierScoreVal * 10);
}

async function runTest() {
    try {
        console.log("1. Creating Test Market...");
        const marketRef = await addDoc(collection(db, 'markets'), {
            question: "Scoring Test Market",
            outcome: null, // Active
            created_at: new Date().toISOString()
        });
        const marketId = marketRef.id;
        console.log("   Market ID:", marketId);

        // Simulate a user prediction
        // We'll use a dummy user ID or finding an existing one if needed, but for isolation let's use a fake one.
        // Actually, we need a real profile to test DB update or created one.
        const userId = "test_scorer_" + Date.now();
        console.log("2. Creating Test Profile:", userId);

        // Initial Profile
        const initialRep = 50;
        await updateDoc(doc(db, 'profiles', userId), { reputation: initialRep }).catch(async () => {
            // If update fails (doc doesn't exist), set it
            const { setDoc } = require('firebase/firestore');
            await setDoc(doc(db, 'profiles', userId), { reputation: initialRep, username: 'TestUser' });
        });

        console.log("   Initial Reputation:", initialRep);

        // Create Prediction
        console.log("3. Placing Prediction (100% YES)...");
        await addDoc(collection(db, 'predictions'), {
            market_id: marketId,
            user_id: userId,
            probability: 100, // Strict Binary YES
            updated_at: new Date().toISOString()
        });

        // Resolve Market
        const outcome = true; // YES
        console.log("4. Resolving Market (YES)...");

        // --- LOGIC FROM APP ---
        const brier = brierScore(100, outcome);
        console.log("   Calculated Brier Score:", brier); // Should be: 1 - (1 - 1)^2 = 1.0

        const newRep = calculateNewReputation(initialRep, brier);
        console.log("   Calculated New Rep:", newRep); // 50 * 0.9 + 1.0 * 10 = 55.0

        console.log("5. Updating DB...");
        await updateDoc(doc(db, 'profiles', userId), { reputation: newRep });

        // Fetch to verify
        const finalSnap = await getDoc(doc(db, 'profiles', userId));
        console.log("6. Final Reputation in DB:", finalSnap.data().reputation);

        if (Math.abs(finalSnap.data().reputation - newRep) < 0.01) {
            console.log("SUCCESS: Logic and DB update verified.");
        } else {
            console.error("FAILURE: DB value mismatch.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

runTest();
