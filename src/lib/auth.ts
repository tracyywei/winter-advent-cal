import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Studio login: one password (STUDIO_PASSWORD) and an HMAC-signed session cookie. */
export const SESSION_COOKIE = "studio_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

function env(name: "STUDIO_PASSWORD" | "STUDIO_SECRET") {
  const v = process.env[name];
  if (!v || (name === "STUDIO_SECRET" && v.length < 16)) {
    throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  }
  return v;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

// Signing with the password too means changing the password signs everyone out.
const sign = (value: string) =>
  createHmac("sha256", env("STUDIO_SECRET")).update(value).update(sha256(env("STUDIO_PASSWORD"))).digest("base64url");

export function passwordMatches(input: string) {
  return timingSafeEqual(sha256(input), sha256(env("STUDIO_PASSWORD")));
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const value = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(value));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  const exp = Number(value.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export async function isStudioAuthed() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For studio pages: bounce to the login page if not signed in. */
export async function requireStudio() {
  if (!(await isStudioAuthed())) redirect("/studio/login");
}

/** For server actions and API routes: refuse to run if not signed in. */
export async function assertStudio() {
  if (!(await isStudioAuthed())) throw new Error("Not signed in to the studio");
}

export async function startSession() {
  const value = `v1.${Date.now() + MAX_AGE_S * 1000}`;
  (await cookies()).set(SESSION_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
