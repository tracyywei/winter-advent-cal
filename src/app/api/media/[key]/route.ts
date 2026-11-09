import { signedMediaUrl } from "@/lib/media";
import { MEDIA_KEY_RE } from "@/lib/media-key";

/**
 * Redirects to a 1-hour signed link to the file in the private bucket.
 * Supabase serves it, including the Range requests Safari needs for video and audio.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[key]">) {
  const { key } = await ctx.params;
  const signed = MEDIA_KEY_RE.test(key) ? await signedMediaUrl(key) : null;
  if (!signed) return new Response("Not found", { status: 404 });
  // Cache the redirect briefly (well under the link's 1-hour life).
  return new Response(null, { status: 307, headers: { Location: signed, "Cache-Control": "private, max-age=600" } });
}
