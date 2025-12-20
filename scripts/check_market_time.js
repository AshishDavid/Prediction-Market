const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsyzkrfsczoaugmrcymj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXprcmZzY3pvYXVnbXJjeW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODE0MjIsImV4cCI6MjA4MTY1NzQyMn0.1zRqzerOeHfPSP8FMdYyKAV2ubnQiW45iw-Y8LFHJCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const marketId = '29f5b545-33ca-4558-9f2b-77134b121fb6';

async function checkTime() {
    const { data, error } = await supabase
        .from('markets')
        .select('id, question, close_time')
        .eq('id', marketId)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("DB Market Data:");
        console.log("ID:", data.id);
        console.log("Question:", data.question);
        console.log("Close Time (DB String):", data.close_time);

        const closeDate = new Date(data.close_time);
        const now = new Date();

        console.log("Parsed Close Date:", closeDate.toString());
        console.log("Current Client Time:", now.toString());
        console.log("Close < Now?", closeDate < now);
    }
}

checkTime();
