/** Everything a door can hold, except riddles (a riddle wraps one of these as its prize). */
export type PrizeContent =
  | { kind: "note"; title?: string; body: string }
  | { kind: "photo"; imageUrl: string; caption?: string }
  /** An uploaded clip URL or a YouTube link. */
  | { kind: "video"; url: string }
  /** A Spotify, Apple Music or YouTube link. */
  | { kind: "song"; url: string }
  | { kind: "voice"; audioUrl: string; title?: string }
  | { kind: "gift"; label: string; code?: string; link?: string }
  | { kind: "coupon"; title: string; fine?: string }
  | { kind: "recipe"; title: string; ingredients: string[]; steps: string[] };

export type RiddleContent = {
  kind: "riddle";
  question: string;
  /** Accepted answers. Matching ignores case, punctuation and a leading "the"/"a". */
  answers: string[];
  prize: PrizeContent;
};

export type DoorContent = PrizeContent | RiddleContent;
export type DoorKind = DoorContent["kind"] | "empty";

export type Door = {
  day: number;
  content: DoorContent;
  /** Optional note from the sender, shown under any kind of content. */
  note?: string;
};

export type Calendar = {
  id: string;
  /** Secret, unguessable part of the recipient's link: /c/<slug> */
  slug: string;
  recipientName: string;
  fromName: string;
  doors: Door[];
};

export type Reaction = {
  emoji?: string;
  note?: string;
  redeemed?: boolean;
  updatedAt: string;
};

/** What the browser receives for an unlocked door. Riddle answers never leave the server. */
export type PublicContent =
  | PrizeContent
  | { kind: "riddle"; question: string; prize?: PrizeContent }
  | { kind: "empty" };

export type PublicDoorResponse = {
  day: number;
  note?: string;
  content: PublicContent;
  reaction: Reaction | null;
};

export type Subscription = {
  channel: "sms" | "email";
  /** E.164 phone number (+15551234567) or email address. */
  address: string;
  consentedAt: string;
};

export const REACTION_EMOJIS = ["🥹", "😂", "❤️", "🎄", "✨", "😭"] as const;
export const MAX_NOTE_LENGTH = 280;
