
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = `testuser_${Date.now()}@gmail.com`;
const password = 'password123';

async function testAuth() {
    console.log(`Testing Auth with ${email}...`);

    // 1. Sign Up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (signUpError) {
        console.error("❌ Sign Up Failed:", signUpError.message);
        return;
    }

    console.log("✅ Sign Up Successful.");
    if (signUpData.user && !signUpData.session) {
        console.warn("⚠️  Session is null. This usually means EMAIL CONFIRMATION IS REQUIRED.");
        console.warn("   Your Supabase project settings likely require email verification.");
    } else if (signUpData.session) {
        console.log("✅ Session received immediately (Email confirmation disabled).");
    }

    // 2. Try to Sign In immediately
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error("❌ Sign In Failed:", signInError.message);
        if (signInError.message.includes("Email not confirmed")) {
            console.error("   -> CONFIRMED: You need to disable 'Confirm email' in Supabase Auth settings.");
        }
    } else {
        console.log("✅ Sign In Successful.");
    }
}

testAuth();
