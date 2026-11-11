/** The advent tree: a big cutesy Christmas tree with 12 ornaments hung on it. */

export type OrnamentState = "locked" | "ready" | "opened";

/** Light and dark tone of each ornament, also used by the big ornament that opens. */
const COLORS: [string, string][] = [
  ["#ffb3c7", "#e8697d"], // pink
  ["#ffe7a3", "#e5a93f"], // gold
  ["#bfe0ff", "#5f8fd0"], // blue
  ["#e0cffb", "#8f6fd0"], // purple
  ["#c3f0d9", "#3f9a6c"], // mint
  ["#ffc9b3", "#df7a5c"], // coral
];

// Color order chosen so neighbors on the tree never match.
const COLOR_OF = [0, 2, 1, 3, 4, 5, 1, 0, 2, 5, 3, 4];

export const ornamentColors = (n: number) => COLORS[COLOR_OF[(n - 1) % COLOR_OF.length]];

/** Where each ornament hangs, in the tree's 300x420 drawing (center of the ball). Top to bottom. */
export const ORNAMENT_SPOTS: [number, number][] = [
  [150, 112],
  [122, 168], [180, 172],
  [98, 226], [152, 230], [206, 224],
  [86, 284], [144, 290], [208, 282],
  [76, 340], [150, 346], [224, 338],
];

const display = { fontWeight: 800 };

/** One small ornament on the tree. Opened ones are split in half with a little star glowing inside. */
export function Ornament({ n, state }: { n: number; state: OrnamentState }) {
  const [light, dark] = ornamentColors(n);
  const id = `orn${n}`;
  const ball = (
    <>
      <circle cx="22" cy="31" r="18" fill={`url(#${id}g)`} />
      <path d="M4.5 31 q4.4 -4 8.8 0 t8.7 0 t8.7 0 t8.8 0" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".7" strokeLinecap="round" />
      <ellipse cx="15" cy="22" rx="4.6" ry="3" fill="#fff" opacity=".7" transform="rotate(-35 15 22)" />
    </>
  );
  return (
    <svg viewBox="0 0 44 52" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <clipPath id={`${id}t`}>
          <rect x="0" y="0" width="44" height="31" />
        </clipPath>
        <clipPath id={`${id}b`}>
          <rect x="0" y="31" width="44" height="21" />
        </clipPath>
      </defs>
      <circle cx="22" cy="4.5" r="3" fill="none" stroke="#f3c34a" strokeWidth="1.8" />
      {state === "opened" ? (
        <>
          <circle cx="22" cy="31" r="9" fill="#fff3b0" opacity=".9" />
          <text x="22" y="36" textAnchor="middle" fontSize="14" fill="#ffd66b">
            ★
          </text>
          <g transform="translate(-2 -6) rotate(-16 22 31)">
            <rect x="16.5" y="7" width="11" height="7" rx="2" fill="#f3c34a" />
            <g clipPath={`url(#${id}t)`}>{ball}</g>
          </g>
          <g transform="translate(1 4) rotate(8 22 31)" clipPath={`url(#${id}b)`}>
            {ball}
          </g>
        </>
      ) : (
        <>
          <rect x="16.5" y="7" width="11" height="7" rx="2" fill="#f3c34a" />
          {ball}
          <text
            x="22"
            y="36.5"
            textAnchor="middle"
            fontSize="14"
            fill="#fff"
            stroke={dark}
            strokeWidth="3"
            paintOrder="stroke"
            style={display}
          >
            {n}
          </text>
        </>
      )}
    </svg>
  );
}

/** A rounded triangle tier of the tree, with a row of snow puffs along its bottom edge. */
function Tier({ apex, base, half, fill }: { apex: number; base: number; half: number; fill: string }) {
  const l = 150 - half;
  const r = 150 + half;
  return (
    <>
      <path d={`M150 ${apex} L${r} ${base} Q${r + 5} ${base + 9} ${r - 9} ${base + 9} L${l + 9} ${base + 9} Q${l - 5} ${base + 9} ${l} ${base} Z`} fill={fill} stroke={fill} strokeWidth="6" strokeLinejoin="round" />
      <line x1={l + 12} y1={base + 7} x2={r - 12} y2={base + 7} stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeDasharray="0 13" />
    </>
  );
}

/** The tree drawing behind the ornaments. The star lights up once every ornament is open. */
export function TreeArt({ finished }: { finished: boolean }) {
  return (
    <svg viewBox="0 0 300 420" aria-hidden="true">
      <rect x="136" y="356" width="28" height="34" rx="4" fill="#9a6a4f" />
      <Tier apex={176} base={352} half={146} fill="#3f9a6c" />
      <Tier apex={98} base={252} half={118} fill="#4fae7d" />
      <Tier apex={50} base={150} half={64} fill="#62c08f" />
      <path d="M96 196 Q150 214 206 192 M64 262 Q150 284 238 258 M52 318 Q150 342 250 314" stroke="#ffe08a" strokeWidth="3" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
      <g className={`va-tree-star${finished ? " lit" : ""}`}>
        <path
          d="M150 14 l7 14.4 15.8 2.2 -11.4 11.2 2.8 15.8 -14.2 -7.6 -14.2 7.6 2.8 -15.8 -11.4 -11.2 15.8 -2.2Z"
          fill="#ffd66b"
          stroke="#ffd66b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
      <rect x="62" y="364" width="44" height="30" rx="5" fill="#f78fb3" />
      <rect x="80.5" y="364" width="7" height="30" fill="#fff" />
      <rect x="196" y="372" width="38" height="22" rx="5" fill="#8fd3ff" />
      <rect x="211.5" y="372" width="7" height="22" fill="#fff" />
    </svg>
  );
}
