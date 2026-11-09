export type HouseState = "locked" | "ready" | "opened";

const PALETTES = [
  { wall: "#f9c9d4", roof: "#e8697d", door: "#b2566c" },
  { wall: "#c3e8d5", roof: "#4fa585", door: "#3d7f68" },
  { wall: "#fde5a6", roof: "#e5953f", door: "#a8692e" },
  { wall: "#dccaf5", roof: "#8f6fd0", door: "#6c50a8" },
  { wall: "#fbd2b6", roof: "#df7a5c", door: "#a85640" },
  { wall: "#c4ddf5", roof: "#5f8fd0", door: "#456fa8" },
];

const display = { fontWeight: 800 };

export function CuteHouse({ day, state }: { day: number; state: HouseState }) {
  // Shift the palette every row so columns don't repeat colors.
  const p = PALETTES[(day * 5 + Math.floor((day - 1) / 6) * 2) % PALETTES.length];
  const lit = state !== "locked";
  const windowFill = lit ? "#ffe28a" : "#55588f";
  const doorFill = state === "opened" ? "#ffd27a" : p.door;
  const numFill = state === "opened" ? p.door : "#fff";

  return (
    <svg viewBox="0 0 60 72" aria-hidden="true">
      <ellipse cx="30" cy="67" rx="29" ry="5" fill="#fff" />
      {day % 3 === 0 && (
        <>
          <rect x="39" y="10" width="7" height="16" rx="2" fill="#d77a7a" />
          <ellipse cx="42.5" cy="10.5" rx="5" ry="2.6" fill="#fff" />
        </>
      )}
      <rect x="10" y="30" width="40" height="37" rx="6" fill={p.wall} />
      <path d="M6 34 L30 9 L54 34 Z" fill={p.roof} stroke={p.roof} strokeWidth="5" strokeLinejoin="round" />
      <path
        d="M16.5 23 L30 8 L43.5 23 Q41 26.5 38.5 24 Q35.5 27.5 32.5 24.5 Q29.5 28 26.5 24.5 Q23.5 27.5 21 24 Q18.5 26.5 16.5 23 Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {lit && (
        <>
          <circle cx="17" cy="44" r="8" fill="#ffe28a" opacity=".35" />
          <circle cx="43" cy="44" r="8" fill="#ffe28a" opacity=".35" />
        </>
      )}
      <circle cx="17" cy="44" r="4.5" fill={windowFill} />
      <circle cx="43" cy="44" r="4.5" fill={windowFill} />
      <path d="M23 67 V53 a7 7 0 0 1 14 0 V67 Z" fill={doorFill} />
      <text x="30" y="62.5" textAnchor="middle" fontWeight="700" fontSize={day > 9 ? 8 : 9.5} fill={numFill} style={display}>
        {day}
      </text>
    </svg>
  );
}

const ORNAMENTS: [number, number, string][] = [
  [40, 58, "#ff8fab"], [61, 54, "#ffe08a"], [47, 36, "#8fd3ff"], [33, 84, "#8fd3ff"],
  [53, 80, "#ff8fab"], [70, 87, "#ffe08a"], [57, 30, "#ff8fab"],
];

/** Door 25: the big Christmas tree at the bottom of the village. */
export function CuteTree() {
  return (
    <svg viewBox="0 0 100 124" aria-hidden="true">
      <ellipse cx="50" cy="116" rx="48" ry="7" fill="#fff" />
      <rect x="44" y="94" width="12" height="18" rx="3" fill="#9a6a4f" />
      <path d="M50 48 L84 92 Q86 96 81 96 L19 96 Q14 96 16 92 Z" fill="#3f9a6c" />
      <path d="M50 30 L76 64 Q78 68 73 68 L27 68 Q22 68 24 64 Z" fill="#4fae7d" />
      <path d="M50 14 L68 42 Q70 46 65 46 L35 46 Q30 46 32 42 Z" fill="#62c08f" />
      <path d="M30 62 Q50 72 72 58 M24 88 Q50 98 80 84" stroke="#ffe08a" strokeWidth="2" fill="none" strokeDasharray="1 4" strokeLinecap="round" />
      {ORNAMENTS.map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6" fill={c} />
      ))}
      <path
        d="M50 2 l3.5 7.2 7.9 1.1 -5.7 5.6 1.4 7.9 -7.1 -3.8 -7.1 3.8 1.4 -7.9 -5.7 -5.6 7.9 -1.1Z"
        fill="#ffd66b"
        stroke="#ffd66b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="16" y="99" width="22" height="16" rx="3" fill="#f78fb3" />
      <rect x="25.5" y="99" width="3" height="16" fill="#fff" />
      <rect x="62" y="102" width="20" height="13" rx="3" fill="#8fd3ff" />
      <rect x="70.5" y="102" width="3" height="13" fill="#fff" />
      <circle cx="50" cy="104" r="9" fill="#fff" />
      <text x="50" y="108" textAnchor="middle" fontWeight="700" fontSize="10" fill="#e86a8a" style={display}>
        25
      </text>
    </svg>
  );
}
