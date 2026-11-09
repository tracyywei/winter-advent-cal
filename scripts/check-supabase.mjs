// Checks that Supabase is set up for the advent calendar: keys, tables, media bucket.
// Run with: npm run check:supabase
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

let envText;
try {
  envText = readFileSync(".env.local", "utf8");
} catch {
  console.log("✗ No .env.local file found in this folder.");
  process.exit(1);
}
for (const line of envText.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
}

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let ok = true;
const pass = (msg) => console.log(`✓ ${msg}`);
const fail = (msg) => {
  ok = false;
  console.log(`✗ ${msg}`);
};

if (!url || !secret) {
  fail("SUPABASE_URL and SUPABASE_SECRET_KEY need to be in .env.local");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) fail(`SUPABASE_URL should look like https://abcd1234.supabase.co`);
if (secret.startsWith("sb_publishable_")) fail("That's the publishable key. Use the secret key (starts with sb_secret_) instead.");

// Realtime isn't used; this placeholder lets the client start on Node versions before 22.
class NoRealtime {}
const db = createClient(url, secret, { auth: { persistSession: false }, realtime: { transport: NoRealtime } });

for (const table of ["calendars", "doors", "opens", "solved_riddles", "reactions", "subscriptions", "message_log"]) {
  const { error } = await db.from(table).select("*").limit(1); // not a HEAD request: those hide errors
  if (error) fail(`Table "${table}": ${error.message}${/does not exist|schema cache/.test(error.message) ? " (run supabase/schema.sql in the SQL Editor)" : ""}`);
  else pass(`Table "${table}"`);
}

const BUCKET_OPTIONS = {
  public: false,
  fileSizeLimit: 52428800, // 50 MB
  allowedMimeTypes: [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
    "video/mp4", "video/quicktime", "video/webm",
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg",
  ],
};

let { data: bucket, error: bucketErr } = await db.storage.getBucket("media");
if (!bucket && /not found/i.test(bucketErr?.message ?? "")) {
  // The SQL Editor can't always create storage buckets, so create it here instead.
  const created = await db.storage.createBucket("media", BUCKET_OPTIONS);
  if (created.error) fail(`Couldn't create the media bucket: ${created.error.message}`);
  else {
    console.log("• Created the private media bucket");
    ({ data: bucket, error: bucketErr } = await db.storage.getBucket("media"));
  }
}
if (bucketErr || !bucket) fail(`Media bucket: ${bucketErr?.message ?? "missing"}`);
else if (bucket.public) fail("Media bucket is public. It should be private.");
else {
  pass(`Media bucket (private, ${bucket.file_size_limit / 1048576} MB limit)`);
  const key = `check-${Date.now()}.txt`;
  const { error: upErr } = await db.storage.from("media").upload(key, new Blob(["hi"], { type: "text/plain" }));
  // text/plain isn't an allowed type, so a rejection here proves the type filter is on.
  if (upErr) pass("Media bucket only accepts photos, video and audio");
  else {
    fail("Media bucket accepted a text file (the allowed types aren't set)");
    await db.storage.from("media").remove([key]);
  }
}

console.log(ok ? "\n🎄 Supabase is ready." : "\nSomething needs fixing (see ✗ above).");
process.exit(ok ? 0 : 1);
