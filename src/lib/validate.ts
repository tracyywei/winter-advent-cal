import { songEmbed } from "./embeds";
import { isMediaPath } from "./media-key";
import type { DoorContent, PrizeContent } from "./types";

/** Server-side check of door content coming from the studio. Returns the clean content or a friendly error. */
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lines = (v: unknown, maxItems = 40) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [])
    .map((x) => str(x, 300))
    .filter(Boolean)
    .slice(0, maxItems);
const isMediaOrHttpUrl = (s: string) => {
  if (isMediaPath(s)) return true;
  try {
    return ["https:", "http:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });
const opt = (k: string, v: string) => (v ? { [k]: v } : {});

function parsePrize(input: unknown): Result<PrizeContent> {
  const v = (input ?? {}) as Record<string, unknown>;
  switch (v.kind) {
    case "note": {
      const body = str(v.body, 5000);
      return body ? ok({ kind: "note", body, ...opt("title", str(v.title, 120)) }) : fail("Write your letter first ✍️");
    }
    case "photo": {
      const imageUrl = str(v.imageUrl, 1000);
      return isMediaOrHttpUrl(imageUrl)
        ? ok({ kind: "photo", imageUrl, ...opt("caption", str(v.caption, 200)) })
        : fail("Upload a photo first 📸");
    }
    case "video": {
      const url = str(v.url, 1000);
      return isMediaOrHttpUrl(url) ? ok({ kind: "video", url }) : fail("Upload a clip or paste a YouTube link 🎬");
    }
    case "song": {
      const url = str(v.url, 1000);
      return songEmbed(url) ? ok({ kind: "song", url }) : fail("Paste a Spotify, Apple Music or YouTube link 🎵");
    }
    case "voice": {
      const audioUrl = str(v.audioUrl, 1000);
      return isMediaOrHttpUrl(audioUrl)
        ? ok({ kind: "voice", audioUrl, ...opt("title", str(v.title, 120)) })
        : fail("Record or upload a voice memo first 🎙️");
    }
    case "gift": {
      const label = str(v.label, 120);
      const code = str(v.code, 200);
      const link = str(v.link, 1000);
      if (!label) return fail("Give the gift card a label, like “$25 Boba” 🎁");
      if (!code && !link) return fail("Add a code, a redemption link, or both");
      if (link && !isMediaOrHttpUrl(link)) return fail("That redemption link doesn't look right");
      return ok({ kind: "gift", label, ...opt("code", code), ...opt("link", link) });
    }
    case "coupon": {
      const title = str(v.title, 160);
      return title ? ok({ kind: "coupon", title, ...opt("fine", str(v.fine, 400)) }) : fail("What's the coupon good for? 🎟️");
    }
    case "recipe": {
      const title = str(v.title, 160);
      const ingredients = lines(v.ingredients);
      const steps = lines(v.steps);
      if (!title) return fail("Give the recipe a name 🍪");
      if (!steps.length) return fail("Add at least one step");
      return ok({ kind: "recipe", title, ingredients, steps });
    }
    default:
      return fail("Pick what goes behind this door");
  }
}

export function parseDoorContent(input: unknown): Result<DoorContent> {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.kind !== "riddle") return parsePrize(v);

  const question = str(v.question, 400);
  const answers = (Array.isArray(v.answers) ? v.answers : str(v.answers, 600).split(/[\n,]/))
    .map((a) => str(a, 100))
    .filter(Boolean)
    .slice(0, 20);
  if (!question) return fail("Write the riddle question 🧩");
  if (!answers.length) return fail("Add at least one accepted answer");
  const prize = parsePrize(v.prize);
  if (!prize.ok) return fail(`Riddle prize: ${prize.error}`);
  return ok({ kind: "riddle", question, answers, prize: prize.value });
}
