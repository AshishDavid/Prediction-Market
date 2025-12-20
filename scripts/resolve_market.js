const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const marketId = process.argv[2];
const outcome = process.argv[3]; // "YES" or "NO"

if (!marketId || !outcome) {
    console.log(`
Usage: node scripts/resolve_market.js <MARKET_ID> <YES|NO>

Example:
  node scripts/resolve_market.js "market-uuid-here" YES
    `);
    process.exit(0);
}

async function resolve() {
    const isTrue = outcome.toUpperCase() === 'YES';
    console.log(`Resolving Market ${marketId} to ${isTrue ? 'YES' : 'NO'}...`);

    const { error } = await supabase
        .from('markets')
        .update({
            outcome: isTrue,
            resolve_time: new Date().toISOString()
        })
        .eq('id', marketId);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("✅ Market Resolved! Leaderboard should update.");
    }
}

resolve();
