/** Hand-drawn SVG icons for the bottom navigation. Sized and dimmed via CSS. */
function Icon({ children }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  )
}

/** Home: star-spangled round shield. */
export function CapShieldIcon() {
  return (
    <Icon>
      <circle cx="16" cy="16" r="15" fill="#d3202a" stroke="#4a0508" strokeWidth="1" />
      <circle cx="16" cy="16" r="11.6" fill="#f4f4f4" />
      <circle cx="16" cy="16" r="8.6" fill="#d3202a" />
      <circle cx="16" cy="16" r="6" fill="#1f4ea8" />
      <path d="M16 10.4 L17.3 14.2 L21.3 14.3 L18.1 16.7 L19.3 20.5 L16 18.2 L12.7 20.5 L13.9 16.7 L10.7 14.3 L14.7 14.2 Z" fill="#fff" />
    </Icon>
  )
}

/** Ranking: golden gauntlet set with the six stones. */
export function InfinityGauntletIcon() {
  return (
    <Icon>
      <g fill="#f2b42c" stroke="#5c3a05" strokeWidth="1">
        {/* Thumb */}
        <path d="M9 23 L3 18.5 C1.5 17 1.5 13.5 3.5 12.5 C5.5 11.8 6.6 13.5 7 15.5 L10 17.5 Z" />
        {/* Fingers */}
        <rect x="7.8" y="4.5" width="5" height="13" rx="2.4" />
        <rect x="12.8" y="1.5" width="5" height="16" rx="2.4" />
        <rect x="17.8" y="2.2" width="5" height="15" rx="2.4" />
        <rect x="22.8" y="5.5" width="5" height="12" rx="2.4" />
        {/* Hand and cuff */}
        <path d="M7.8 14 L27.8 14 L27 22 L25 24.5 L10.5 24.5 L7.8 20 Z" />
        <path d="M10.5 24 L25 24 L28 31 L8 31 Z" fill="#d9951a" />
      </g>
      <path d="M11 27.3 L25.8 27.3" fill="none" stroke="#ffdc7a" strokeWidth="1.2" />
      {/* Stones: knuckles, back of the hand and thumb */}
      <g stroke="#fff" strokeOpacity="0.75" strokeWidth="0.6">
        <circle cx="10.3" cy="14.6" r="2" fill="#a73be8" />
        <circle cx="15.3" cy="14" r="2" fill="#1e86ff" />
        <circle cx="20.3" cy="14" r="2" fill="#ff2238" />
        <circle cx="25.3" cy="14.6" r="2" fill="#ff7a00" />
        <ellipse cx="17.8" cy="20.2" rx="3.4" ry="2.8" fill="#fff23a" />
        <circle cx="4.7" cy="16.2" r="1.8" fill="#22d65f" />
      </g>
    </Icon>
  )
}

/** Profile: red web-slinger mask. */
export function SpiderMaskIcon() {
  return (
    <Icon>
      <path
        d="M16 1.5 C24.5 1.5 28.5 7.5 28.5 15 C28.5 22.5 22 29.5 16 31 C10 29.5 3.5 22.5 3.5 15 C3.5 7.5 7.5 1.5 16 1.5 Z"
        fill="#dd252d" stroke="#4a0508" strokeWidth="1.2"
      />
      {/* Web: threads from between the eyes plus the arcs joining them */}
      <path
        d="M16 15 L16 1.5 M16 15 L7 4.5 M16 15 L25 4.5 M16 15 L3.5 13 M16 15 L28.5 13 M16 15 L6.5 24 M16 15 L25.5 24 M16 15 L16 31
           M16 5.5 Q13.5 7.5 11.5 6.5 Q11 9.5 8 10.5 M16 5.5 Q18.5 7.5 20.5 6.5 Q21 9.5 24 10.5
           M16 10 Q15 11.2 13.2 11 M16 10 Q17 11.2 18.8 11 M10 22 Q13 22.5 16 25.5 Q19 22.5 22 22"
        fill="none" stroke="#5c070b" strokeWidth="0.7"
      />
      <g fill="#fff" stroke="#111" strokeWidth="1.6">
        <path d="M5.8 12.5 C10 13 13.8 15.8 14.4 20.2 C10.5 23 6 19.8 5.8 12.5 Z" />
        <path d="M26.2 12.5 C22 13 18.2 15.8 17.6 20.2 C21.5 23 26 19.8 26.2 12.5 Z" />
      </g>
    </Icon>
  )
}
