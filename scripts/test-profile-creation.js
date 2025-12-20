
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = `profiletest_${Date.now()}@gmail.com`;
const password = 'password123';

async function testFlow() {
    console.log(`Testing Full Flow with ${email}...`);

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error("❌ Sign Up Failed:", authError.message);
        return;
    }
    console.log("✅ Sign Up Auth OK.");

    if (!authData.user) {
        console.error("❌ No user returned.");
        return;
    }

    const user = authData.user;
    const session = authData.session;

    // NOTE: If Email Confirmation is still ON, session might be null.
    // User said they decided to KEEP email verification.
    // So session WILL BE NULL here.

    if (!session) {
        console.log("ℹ️  Session is null (Email Verification required).");
        console.log("ℹ️  We cannot test Profile Creation directly via script without a session token.");
        console.log("ℹ️  However, we can try to Insert via Admin SDK? No, we only have Anon Key.");
        console.log("⚠️  Please verify 'profiles' table permissions manually.");

        // Try to insert WITHOUT valid session (Simulating what happens if we tried)
        // Actually app/login.js `ensureProfile` is called AFTER `signIn` returns a session.
        // So we need to simulate a LOGIN with a VERIFIED account.

        console.log("⏩ Skipping Profile Insert test because we can't auto-verify email.");
        return;
    }

    console.log("✅ Session Active. Attempting Profile Insert...");

    const { error: profileError } = await supabase.from('profiles').insert([
        { id: user.id, username: email.split('@')[0] }
    ]);

    if (profileError) {
        console.error("❌ Profile Insert Failed:", profileError);
        console.error("   -> CAUSE: Likely RLS (Row Level Security) blocking writes.");
        console.error("   -> FIX: Disable RLS on 'profiles' or add a policy.");
    } else {
        console.log("✅ Profile Insert Successful.");
    }
}

testFlow();
