import type { NextRequest } from "next/server";
import { json } from "@/lib/doors";
import { store } from "@/lib/store";

/** US phone number → E.164 (+15551234567), or null if it isn't a valid 10-digit number. */
function toE164(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10 || /^[01]/.test(digits)) return null;
  return `+1${digits}`;
}

/**
 * Signs the recipient up for daily reminders.
 * TODO (SMS step): send a welcome text through Twilio once the number is approved.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/c/[slug]/subscribe">) {
  const { slug } = await ctx.params;
  const cal = await store.getCalendarBySlug(slug);
  if (!cal) return json({ error: "not_found" }, 404);

  const body = (await req.json().catch(() => null)) as { channel?: unknown; address?: unknown; consent?: unknown } | null;
  const raw = typeof body?.address === "string" ? body.address.trim().slice(0, 200) : "";

  const channel = body?.channel === "sms" || body?.channel === "email" ? body.channel : null;
  if (!channel) return json({ error: "bad_channel" }, 400);
  if (channel === "sms" && body?.consent !== true) return json({ error: "consent_required" }, 400);

  const address =
    channel === "sms" ? toE164(raw) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw.toLowerCase() : null;
  if (!address) return json({ error: "bad_address" }, 400);

  await store.saveSubscription(cal.id, { channel, address, consentedAt: new Date().toISOString() });
  return json({ ok: true });
}
