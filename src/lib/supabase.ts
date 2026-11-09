import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. It uses the secret key, which bypasses Row Level
 * Security, so it must never reach the browser (the "server-only" import above
 * makes the build fail if a client component ever imports this file).
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const MEDIA_BUCKET = "media";

/**
 * We never use Supabase Realtime, but the client checks for a WebSocket when it's
 * created, and Node versions before 22 don't have one built in. This placeholder
 * satisfies that check and fails loudly if anything ever tries to use it.
 */
class NoRealtime {
  constructor() {
    throw new Error("Supabase Realtime isn't used in this app");
  }
}

const g = globalThis as unknown as { __supabase?: SupabaseClient };

export function supabase(): SupabaseClient {
  if (!url || !secret) throw new Error("Supabase isn't configured: set SUPABASE_URL and SUPABASE_SECRET_KEY");
  g.__supabase ??= createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see NoRealtime above
    realtime: { transport: NoRealtime as any },
  });
  return g.__supabase;
}
