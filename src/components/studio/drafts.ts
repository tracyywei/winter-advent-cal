import type { DoorContent, PrizeContent } from "@/lib/types";

/** Editable, all-strings version of door content, so switching kinds never loses what you typed. */
export type DraftKind = DoorContent["kind"];
export type Draft = {
  kind: DraftKind | "";
  title: string;
  body: string;
  imageUrl: string;
  caption: string;
  url: string;
  audioUrl: string;
  label: string;
  code: string;
  link: string;
  fine: string;
  ingredients: string;
  steps: string;
  question: string;
  answers: string;
  prize?: Draft;
};

export const KINDS: { kind: DraftKind; emoji: string; label: string }[] = [
  { kind: "note", emoji: "💌", label: "Letter" },
  { kind: "photo", emoji: "📸", label: "Photo" },
  { kind: "video", emoji: "🎬", label: "Video" },
  { kind: "song", emoji: "🎵", label: "Song" },
  { kind: "voice", emoji: "🎙️", label: "Voice memo" },
  { kind: "gift", emoji: "🎁", label: "Gift card" },
  { kind: "coupon", emoji: "🎟️", label: "Coupon" },
  { kind: "recipe", emoji: "🍪", label: "Recipe" },
  { kind: "riddle", emoji: "🧩", label: "Riddle" },
];
export const KIND_EMOJI = Object.fromEntries(KINDS.map((k) => [k.kind, k.emoji])) as Record<DraftKind, string>;

export function emptyDraft(kind: Draft["kind"] = ""): Draft {
  return {
    kind, title: "", body: "", imageUrl: "", caption: "", url: "", audioUrl: "", label: "", code: "",
    link: "", fine: "", ingredients: "", steps: "", question: "", answers: "",
  };
}

function prizeToDraft(c: PrizeContent): Draft {
  const d = emptyDraft(c.kind);
  switch (c.kind) {
    case "note": return { ...d, title: c.title ?? "", body: c.body };
    case "photo": return { ...d, imageUrl: c.imageUrl, caption: c.caption ?? "" };
    case "video": return { ...d, url: c.url };
    case "song": return { ...d, url: c.url };
    case "voice": return { ...d, audioUrl: c.audioUrl, title: c.title ?? "" };
    case "gift": return { ...d, label: c.label, code: c.code ?? "", link: c.link ?? "" };
    case "coupon": return { ...d, title: c.title, fine: c.fine ?? "" };
    case "recipe": return { ...d, title: c.title, ingredients: c.ingredients.join("\n"), steps: c.steps.join("\n") };
  }
}

export function toDraft(c: DoorContent | undefined): Draft {
  if (!c) return emptyDraft();
  if (c.kind === "riddle") {
    return { ...emptyDraft("riddle"), question: c.question, answers: c.answers.join("\n"), prize: prizeToDraft(c.prize) };
  }
  return prizeToDraft(c);
}

/** Shape sent to the server (which validates it with parseDoorContent). */
export function fromDraft(d: Draft): Record<string, unknown> {
  const base: Record<string, unknown> = { ...d };
  delete base.prize;
  if (d.kind === "riddle") base.prize = d.prize ? fromDraft(d.prize) : {};
  return base;
}
