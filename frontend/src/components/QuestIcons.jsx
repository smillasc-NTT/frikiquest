/** Hand-drawn SVG icons for the daily quest buttons. Sized via CSS. */
function Icon({ children }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  )
}

/** Training: green gamma-powered flexed arm with a torn purple sleeve. */
export function HulkArmIcon() {
  return (
    <Icon>
      <path
        d="M11 33 C15 22 30 19 36 33 C38 28 36 23 33 19 C30 17 30 12 33 9 C36 4 46 3 51 7 C55 10 55 15 53 19 C61 27 63 41 56 50 C48 61 27 61 10 55 Z"
        fill="#5cb82c" stroke="#173d0b" strokeWidth="2.5"
      />
      {/* Muscle shading and highlights */}
      <path d="M17 49 C30 55 46 54 54 45 C49 56 30 60 14 53 Z" fill="#3d8a1c" />
      <path d="M17 32 C21 27 28 26 32 31" fill="none" stroke="#a6e86a" strokeWidth="3" />
      <path d="M53 27 C56 31 57 36 56 40" fill="none" stroke="#a6e86a" strokeWidth="2.5" />
      <path d="M36 33 C34 37 30 39 26 39 M36 33 C40 37 44 37 47 35" fill="none" stroke="#173d0b" strokeWidth="2" />
      {/* Fist */}
      <path d="M37 7 C36 10 36 12 38 14 M43 6 C42 9 42 11 44 14 M49 7 C48 9 48 11 49 13 M33 19 C38 22 46 21 52 18" fill="none" stroke="#173d0b" strokeWidth="2" />
      {/* Torn sleeve */}
      <path d="M3 31 L15 28 L13 35 L20 38 L14 42 L19 48 L13 49 L16 57 L3 59 Z" fill="#7b3fa8" stroke="#2d1240" strokeWidth="2.5" />
    </Icon>
  )
}

/** Steps: red speedster boot with golden wing and lightning trim. */
export function SpeedsterBootIcon() {
  return (
    <Icon>
      <path
        d="M23 6 L41 8 L42 30 C47 37 58 36 61 45 L61 51 L22 51 C19 44 20 37 22 31 Z"
        fill="#e0201b" stroke="#4a0605" strokeWidth="2.5"
      />
      <path d="M37 12 L38 31 C43 39 52 40 57 44" fill="none" stroke="#ff6a5c" strokeWidth="3" />
      {/* Lightning cuff */}
      <path d="M23 10 L31 15 L30 12 L41 16 L41 22 L31 18 L32 21 L23 16 Z" fill="#ffd21f" stroke="#6b4a00" strokeWidth="1.5" />
      {/* Sole */}
      <path d="M21 51 L61 51 L59 57 L48 57 L45 54 L38 57 L23 57 Z" fill="#ffd21f" stroke="#6b4a00" strokeWidth="2" />
      {/* Wing */}
      <path d="M34 32 L5 18 L15 29 L2 29 L16 37 L7 41 L31 42 Z" fill="#ffd21f" stroke="#6b4a00" strokeWidth="2" />
      <path d="M29 35 L15 29 M29 39 L17 37" fill="none" stroke="#fff3a6" strokeWidth="2" />
    </Icon>
  )
}

/** Nutrition: chimichanga with a red merc-with-a-mouth mask badge. */
export function ChimichangaIcon() {
  return (
    <Icon>
      <g transform="rotate(-32 32 32)">
        {/* Filling peeking out of the top end */}
        <path d="M50 22 C57 18 62 24 59 28 C65 31 62 38 58 38 C61 43 54 47 49 42 Z" fill="#6fbf3a" stroke="#24480f" strokeWidth="2" />
        <circle cx="57" cy="32" r="3.5" fill="#e53935" />
        <rect x="3" y="19" width="52" height="26" rx="12" fill="#e9a23b" stroke="#6a3b08" strokeWidth="2.5" />
        <path d="M12 24 C22 21 38 21 47 24" fill="none" stroke="#ffd27a" strokeWidth="3" />
        <path d="M16 31 L22 36 M27 28 L35 35 M40 29 L46 34" fill="none" stroke="#a8641a" strokeWidth="2.5" />
      </g>
      {/* Mask badge, tucked into the bottom-right corner */}
      <g transform="translate(47 47) scale(0.78) translate(-43 -43)">
        <circle cx="43" cy="43" r="17" fill="#d32027" stroke="#1a0505" strokeWidth="3" />
        <path d="M43 27 L43 59" stroke="#1a0505" strokeWidth="2" />
        <path d="M40 38 C34 31 28 36 29 44 C30 51 38 50 40 45 Z" fill="#141414" />
        <path d="M46 38 C52 31 58 36 57 44 C56 51 48 50 46 45 Z" fill="#141414" />
        <path d="M32 41 L38 42 C37 45 33 45 32 41 Z" fill="#fff" />
        <path d="M54 41 L48 42 C49 45 53 45 54 41 Z" fill="#fff" />
      </g>
    </Icon>
  )
}
