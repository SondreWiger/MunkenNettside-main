import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllSeats() {
  console.log("Deleting all seats...");
  const { error, count } = await supabase.from("seats").delete().neq("id", "");

  if (error) {
    console.error("Error deleting seats:", error.message);
    process.exit(1);
  }

  console.log(`Deleted ${count} seats`);
}

deleteAllSeats();
