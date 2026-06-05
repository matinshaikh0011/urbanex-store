# Implementation Plan

## Overview

This plan builds the storefront shutter reveal as an overlay inside the existing `HeroBanner` component. A hard **visual-approval gate** (Task 5) sits before final motion refinement — no polishing proceeds until the closed / mid-open / fully-revealed states are approved.

Defaults carried from the design's open decisions (changeable at the gate): branding **Variant A (red sign plate)**, motion = overshoot + settle + optional metallic shake, auto-lift **3s**. All work is confined to `frontend/src/components/HeroBanner.tsx` and `HeroBanner.module.css`.

## Task Dependency Graph

```
1 (trigger + state machine)
└─▶ 2 (markup + door structure)
      ├─▶ 3 (storefront sign / branding)
      └─▶ 4 (anticipation effects)
            └─▶ 5 (VISUAL APPROVAL GATE)
                  └─▶ 6 (roll-up animation + reveal choreography)
                        └─▶ 7 (controls, gestures, behavior)
                              └─▶ 8 (hero integration + regression)
                                    └─▶ 9 (verification matrix)
```

Tasks 3 and 4 may proceed in parallel after Task 2. Everything downstream of the gate (6–9) is blocked until Task 5 is approved.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4"] },
    { "wave": 4, "tasks": ["5"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] },
    { "wave": 7, "tasks": ["8"] },
    { "wave": 8, "tasks": ["9"] }
  ]
}
```

## Tasks

- [ ] 1. Trigger logic and shutter state machine
  - Add `ShutterState` (`'closed' | 'opening' | 'open'`) state to `HeroBanner.tsx`
  - Implement `shouldPlayShutter()`: reduced-motion → false; dev → true (ignore flag); prod → `navigation.type ∈ {navigate, reload}`
  - Add module-scoped `playedThisDocument` guard so internal navigation back to `/` never replays
  - Initialise state to `open` when not playing, `closed` when playing
  - Track all timeouts in a ref; clear on unmount
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1; Properties 2, 3, 4, 5, 7_

- [ ] 2. Shutter markup and door structure (closed state)
  - [ ] 2.1 Add the overlay JSX (housing, door, slats, sign, rail, glow, lift/skip controls) as the last child of the hero `<section>`, rendered only when `shutterState !== 'open'`; `role="dialog"` + `aria-label`; SKIP and LIFT as real focusable `<button>`s
    - _Requirements: 1.4, 1.6, 6.1, 9.2, 9.3_
  - [ ] 2.2 Build the horizontal corrugated slats in CSS (vertical-repeat slat profile, 35px pitch desktop / ~26px mobile) + cross-width cylindrical sheen + inset hard shadows; must read as stacked horizontal slats, never vertical ribs
    - _Requirements: 1.1, 1.2_
  - [ ] 2.3 Build the top housing/drum and the weighted bottom rail with grip slot; add the thin red accent band/pinstripe
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 3. Storefront sign — readable branding (Variant A default)
  - Red `#CC0000` sign plate, white border, hard black shadow, corner rivet dots
  - `URBANEX` wordmark in Oswald 700 white with hard black text-shadow; `EST. STREETWEAR` tagline secondary
  - Verify legibility at 50% zoom; never dark-on-dark
  - Also stub Variant B (white stencil) styles behind a class so the gate can compare
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Anticipation effects (closed state)
  - Light leak along slat seams (opacity pulse), breathing interior `.glow`, faint featured-product silhouette (reads hero `current`), spotlight warm-up loop; no progress/spinner affordance
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. VISUAL APPROVAL GATE — capture states for sign-off
  - Run the dev server; capture screenshots of **closed**, **mid-open** (~50%), and **fully revealed** for branding Variant A and Variant B
  - Present to owner; do not proceed to Task 6+ refinement until a variant + look is explicitly approved
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 6. Mechanical roll-up animation and reveal choreography
  - [ ] 6.1 Door roll-up keyframe: engage dip → weighted lift (`translate3d` Y) → overshoot to -103% → settle to -100.5%; `transform-origin: top center`; weighted cubic-bezier; optional 2-frame metallic shake; transform/opacity only (not scaleY, not linear slide, not bouncy)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5; Property 6_
  - [ ] 6.2 Reveal sequence: gate hero intro animations via a `heroSealed` class until `opening`; progressive product reveal; spotlight bloom timed to the door clearing the showcase; CTAs interactive on settle
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 6.3 Unmount overlay at end of `opening` (~1.32s) → state `open`; ensure no leftover pointer-blocking layer
    - _Requirements: 6.3; Property 1_

- [ ] 7. Controls, gestures, and behavior wiring
  - LIFT click + SKIP click/keyboard → start `opening`; bobbing chevron; controls fade on `opening`
  - Mobile swipe-up (Δy < −36px) lifts; auto-lift after 3s with no input
  - _Requirements: 7.3, 8.5, 8.6, 9.2_

- [ ] 8. Hero integration & regression safety
  - Confirm no-shutter path leaves hero animating normally (class never applied)
  - Verify product cycling, category switch, CTA logic, featured showcase, stat counters, ticker all behave identically post-reveal
  - Confirm zero layout shift (DevTools performance/CLS)
  - _Requirements: 6.1, 6.2, 6.3, 6.4; Properties 1, 6_

- [ ] 9. Verification matrix
  - Dev refresh plays every time; prod first-visit/refresh plays; internal nav + category change do not replay
  - Reduced-motion → instant open, no animation; skip (mouse+keyboard) → instant open; auto-lift fires
  - Mobile swipe-up works, no jank, no CLS; performance recording confirms transform/opacity-only compositing
  - Build + typecheck clean; clean up any temporary files
  - _Requirements: 5.5, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.4, 8.6, 9.1; Properties 2, 3, 4, 5, 6, 7_

## Notes

- **Scope:** only `HeroBanner.tsx` and `HeroBanner.module.css` are modified. No backend, schema, routing, or other-component changes.
- **Approval gate:** Task 5 is a blocking checkpoint per Requirement 10 — implementation must pause for explicit visual approval before Tasks 6–9.
- **Prior art:** this replaces the existing (rejected) shutter code in `HeroBanner`. Task 1 should remove/replace the old shutter implementation rather than layer on top of it.
- **No new dependencies:** pure CSS + React state; transform/opacity-only animation; no libraries.
