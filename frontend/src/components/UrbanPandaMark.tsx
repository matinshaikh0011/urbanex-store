'use client';

/**
 * URBAN PANDA — final mascot (Concept 2: Mischievous Streetwear).
 *
 * Hand-drawn graffiti sticker feel, not generic SVG:
 *  - irregular marker outline (wobbled head path, uneven weight)
 *  - die-cut white sticker border so it "belongs" as a peel-and-stick mark
 *  - asymmetric eyes (one wide, one half-lidded) for attitude
 *  - raised brow + smirk + cheek fang + paint drip off a patch
 *  - black ink + bone fill only; reads on light AND dark backgrounds
 *
 * `variant`:
 *   'full'  — whole head (standalone sticker / about page / loaders)
 *   'peek'  — same art; parent clips it behind the wordmark
 */
export default function UrbanPandaMark({
  className = '',
  sticker = true,
}: {
  className?: string;
  sticker?: boolean;
}) {
  return (
    <svg viewBox="0 0 160 150" className={className} role="img" aria-label="UrbanEx panda">
      <defs>
        {/* Marker-edge roughen — gives the ink a hand-painted wobble */}
        <filter id="uxRough" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Slightly heavier roughen for the bold outline only */}
        <filter id="uxRoughOutline" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* ── DIE-CUT STICKER BORDER (bone halo around the whole mark) ── */}
      {sticker && (
        <path
          d="M80 12
             C 44 10, 20 34, 20 70
             C 18 104, 40 138, 80 138
             C 120 138, 142 104, 140 70
             C 140 34, 116 14, 80 12 Z"
          fill="#f4f2ed"
          stroke="#f4f2ed"
          strokeWidth="13"
          strokeLinejoin="round"
        />
      )}

      {/* ── EARS (rough ink discs) ── */}
      <g filter="url(#uxRough)">
        <circle cx="38" cy="34" r="20" fill="#0a0a0a" />
        <circle cx="122" cy="30" r="20" fill="#0a0a0a" />
        {/* ear scuff highlights */}
        <path d="M32 28 q5 -4 10 0" stroke="#f4f2ed" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M116 24 q5 -4 10 0" stroke="#f4f2ed" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* ── HEAD — irregular marker outline (the graffiti weight) ── */}
      <path
        filter="url(#uxRoughOutline)"
        d="M80 16
           C 42 15, 22 40, 23 70
           C 22 100, 44 128, 80 127
           C 116 128, 138 100, 137 70
           C 138 40, 118 17, 80 16 Z"
        fill="#f4f2ed"
        stroke="#0a0a0a"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      <g filter="url(#uxRough)">
        {/* ── EYE PATCHES — angular graffiti shapes, with a paint drip ── */}
        {/* left patch (slightly bigger = asymmetry) */}
        <path d="M58 48
                 C 41 47, 31 60, 36 74
                 C 40 85, 58 85, 63 71
                 C 65 62, 64 49, 58 48 Z" fill="#0a0a0a" />
        {/* right patch + drip running down */}
        <path d="M102 45
                 C 119 44, 128 58, 123 72
                 C 119 83, 101 84, 96 70
                 C 94 60, 95 47, 102 45 Z" fill="#0a0a0a" />
        <path d="M118 80 C 117 88, 119 96, 121 99 C 124 95, 123 86, 122 80 Z" fill="#0a0a0a" />

        {/* ── EYES — asymmetric & expressive. Pupils/sparks grouped so an
             animation wrapper can shift gaze; lids enable a blink. At rest
             the lids are zero-height (invisible) — design unchanged. ── */}
        {/* LEFT: wide, alert */}
        <ellipse cx="52" cy="64" rx="9.5" ry="11" fill="#f4f2ed" />
        <g className="ux-pupil ux-pupil-l">
          <circle cx="54" cy="65" r="5.2" fill="#0a0a0a" />
          <circle cx="56" cy="62.5" r="2" fill="#f4f2ed" />
        </g>
        {/* RIGHT: half-lidded (sly) — lid cuts the top third */}
        <ellipse cx="106" cy="64" rx="9.5" ry="11" fill="#f4f2ed" />
        <g className="ux-pupil ux-pupil-r">
          <circle cx="104" cy="66" r="5" fill="#0a0a0a" />
          <circle cx="106" cy="63.5" r="1.8" fill="#f4f2ed" />
        </g>
        <path d="M96 60 C 102 55, 112 55, 116 60 L 116 56 C 110 52, 100 52, 96 57 Z" fill="#0a0a0a" />

        {/* Blink lids — bone rects, zero height at rest (no visual change) */}
        <rect className="ux-lid ux-lid-l" x="42.5" y="53" width="19" height="0" fill="#f4f2ed" />
        <rect className="ux-lid ux-lid-r" x="96.5" y="53" width="19" height="0" fill="#f4f2ed" />
      </g>

      {/* ── RAISED BROW (right) — the attitude line ── */}
      <path filter="url(#uxRough)" d="M96 42 Q 108 35, 120 41" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />
      {/* left brow — flatter, cocky */}
      <path filter="url(#uxRough)" d="M44 44 Q 54 41, 64 45" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />

      {/* ── NOSE ── */}
      <path filter="url(#uxRough)" d="M72 90 Q 80 96, 88 90 Q 83 99, 80 99 Q 77 99, 72 90 Z" fill="#0a0a0a" />

      {/* ── SMIRK — asymmetric, rises on the right. `ux-smirk` lets the
           animation deepen it on cue; rest state unchanged. ── */}
      <path className="ux-smirk" filter="url(#uxRough)" d="M66 100 C 74 107, 92 107, 100 95"
            fill="none" stroke="#0a0a0a" strokeWidth="4.5" strokeLinecap="round" />
      {/* cheek fang poking out */}
      <path d="M86 101 l 0 6 l 4 -4 Z" fill="#f4f2ed" stroke="#0a0a0a" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
