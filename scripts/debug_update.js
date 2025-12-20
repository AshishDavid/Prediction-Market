
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MARKET_ID = 'b8fc0348-4024-472c-8fea-b608c9e243f2'; // The Inflation market
// Use a hardcoded user ID if we have one, otherwise we need to sign in
// Since we don't know the user's password here easily, we will try to just Update using the anon key if RLS allows it.
// If RLS is truly disabled, we can insert directly into 'predictions' with ANY user_id.

async function testUpdate() {
    console.log("🧪 Testing DB Upsert Logic...");

    // 1. Get an existing prediction to hijack user_id from
    const { data: existing } = await supabase.from('predictions').select('*').limit(1).single();
    if (!existing) {
        console.error("❌ No existing predictions to test with.");
        return;
    }

    const USER_ID = existing.user_id;
    console.log(`👤 Using User ID: ${USER_ID}`);
    console.log(`📉 Current Value: ${existing.probability}%`);

    const NEW_VAL = existing.probability === 100 ? 0 : 100; // Flip it
    console.log(`🔄 Attempting to update to: ${NEW_VAL}%`);

    // 2. Perform Upsert
    const { data, error } = await supabase
        .from('predictions')
        .upsert({
            user_id: USER_ID,
            market_id: existing.market_id,
            probability: NEW_VAL
        })
        .select();

    if (error) {
        console.error("❌ Upsert Failed:", error);
    } else {
        console.log("✅ Upsert Call Success. Returned:", data);
    }

    // 3. Verify immediately by reading back
    const { data: check } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('market_id', existing.market_id)
        .single();

    console.log(`👀 Read-back Value: ${check.probability}%`);

    if (check.probability === NEW_VAL) {
        console.log("🎉 SUCCESS: Database persisted the change.");
    } else {
        console.log("🚫 FAILURE: Database did NOT persist the change (Reverted to old value).");
    }
}

testUpdate();
