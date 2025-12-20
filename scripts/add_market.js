const { createClient } = require('@supabase/supabase-js');

// Config check
const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Error: Missing Supabase Credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const question = process.argv[2];
const source = process.argv[3] || 'User Created';
const days = process.argv[4] || 7; // Default 7 days

if (!question) {
    console.log(`
Usage: node scripts/add_market.js "<Question>" "<Source/Description>" <DaysOpen>

Example:
  node scripts/add_market.js "Will it snow tomorrow?" "Weather.com" 1
    `);
    process.exit(0);
}

async function addMarket() {
    console.log(`Creating Market: "${question}"...`);

    // Calculate close time
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + parseInt(days));

    const { data, error } = await supabase
        .from('markets')
        .insert([
            {
                question: question,
                description: source,
                close_time: closeDate.toISOString()
            }
        ])
        .select();

    if (error) {
        console.error("Error creating market:", error.message);
    } else {
        console.log("✅ Market Created Successfully!");
        console.log("ID:", data[0].id);
        console.log("Refresh your app to see it.");
    }
}

addMarket();
