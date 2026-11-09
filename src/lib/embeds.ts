type Embed =
  | { provider: "spotify" | "apple"; src: string; height: number }
  | { provider: "youtube"; src: string };

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function youtubeId(url: string): string | null {
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
    if (m) return m[1];
  }
  return null;
}

/** Turns a Spotify / Apple Music / YouTube share link into an embeddable player URL. */
export function songEmbed(url: string): Embed | null {
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (m) return { provider: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" ? 152 : 352 };
  }
  if (host === "music.apple.com") {
    return { provider: "apple", src: `https://embed.music.apple.com${u.pathname}${u.search}`, height: u.searchParams.has("i") ? 175 : 450 };
  }
  const yt = youtubeId(url);
  if (yt) return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt}` };
  return null;
}
