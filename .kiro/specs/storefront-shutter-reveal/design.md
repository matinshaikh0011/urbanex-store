# Design Document

## Overview

The Storefront Shutter Reveal is a self-contained overlay layer rendered inside the existing `HeroBanner` section. It covers the hero on qualifying loads with a realistic industrial roller door, then "opens" — rolling the slats up into a top housing to reveal the hero behind it.

The design is deliberately **decorative and emotional**: even as a still frame the closed shutter is a premium brand statement (crafted steel + a bold storefront sign), and in motion it delivers the "store opening for the day" moment.

Critically, this is a **reveal layer only**. It mounts as the last child of the existing hero `<section>`, sits on a high `z-index`, and unmounts when the reveal completes. It never touches the hero's product-cycling, category-switching, CTA, or featured-product logic.

### Why the previous attempts failed (and how this design avoids it)
| Prior failure | Root cause | This design's fix |
|---|---|---|
| "Barcode / striped background" | `repeating-linear-gradient(90deg)` = vertical ribs | Horizontal slats via individual stacked slat elements with a real per-slat light model |
| "Unreadable branding" | dark-gray embossed text on dark metal | A high-contrast storefront **sign panel**: red plate + white stencil wordmark with hard black shadow |
| "Gaming / graffiti / loading screen" | spray drips, dashed boxes, generic squash | Clean storefront object: housing + slats + weighted rail + sign; mechanical roll-up with weight |

---

## Architecture

### Component structure
The shutter stays inside `HeroBanner.tsx` (no new route, no new top-level component) so it can read the hero's `current` featured product for the silhouette and coordinate the reveal handoff.

```
<section class="hero">              ← existing hero, position: relative, isolate
  <div class="bg" />                ← existing animated background
  <div class="tape" />              ← existing ticker
  <div class="content"> … </div>    ← existing hero content (typography, CTAs, showcase)
  <div class="scrollCue" />         ← existing
  {shutterState !== 'open' && (
    <div class="shutter">           ← NEW overlay, z-index above hero content
      <div class="housing" />         ← top drum the slats roll into
      <div class="door">             ← the moving roller door (transform target)
        <div class="slats" />          ← N stacked horizontal slat elements
        <div class="sign">             ← storefront sign (the readable brand)
          <span class="wordmark">URBANEX</span>
          <span class="tagline">EST. STREETWEAR</span>
        </div>
        <div class="rail">             ← weighted bottom bar
          <span class="handle" />
        </div>
      </div>
      <div class="glow" />            ← interior light leak / spotlight warm-up (behind door, anticipation)
      <button class="lift">LIFT TO ENTER</button>
      <button class="skip">SKIP</button>
    </div>
  )}
</section>
```

### State machine
```
closed ──(swipe-up | click lift | click skip | auto-lift ~3s)──▶ opening ──(~1.3s anim)──▶ open
   │
   └─(prefers-reduced-motion | non-qualifying load)─────────────────────────────────────▶ open (instant)
```

- `closed`: door down, anticipation effects running, controls visible.
- `opening`: door rolls up, reveal sequence fires, controls fade.
- `open`: overlay unmounted, hero fully interactive.

### Trigger decision (mount-time)
A single helper decides the initial state:

```
function shouldPlayShutter(): boolean {
  if (prefersReducedMotion) return false;            // → open instantly (Req 9.1)
  if (isDevelopment) return true;                    // dev: every refresh (Req 8.1)
  // production:
  const navType = performance.getEntriesByType('navigation')[0]?.type;
  // 'navigate'  = first visit / typed URL / external link  → play (Req 8.2)
  // 'reload'    = browser refresh                            → play (Req 8.3)
  // back_forward / SPA route changes never re-mount the homepage with a fresh load,
  // and internal <Link> navigation keeps the same document, so the hero re-mount
  // is gated by a module-level "playedThisDocument" flag to avoid replays during
  // client-side navigation back to "/" (Req 8.4).
  return navType === 'navigate' || navType === 'reload';
}
```

- **Dev mode** is detected via `process.env.NODE_ENV !== 'production'`. In dev the played-flag is ignored, so every refresh and every HMR remount replays.
- **Production** uses the Navigation Timing API (`navigation.type`) to distinguish a real load (`navigate`/`reload`) from `back_forward`. A module-scoped `playedThisDocument` boolean prevents replays when the user returns to `/` via client-side navigation within the same document (returning from a product page, changing a category that routes through `/products`, etc.), satisfying Req 8.4.
- `sessionStorage` is **not** used for gating (the requirement explicitly wants refresh to replay), avoiding the prior implementation's "skip on every session" behavior.

---

## Components and Interfaces

> (Section title aligned to Kiro spec format; covers both the visual components and the component interfaces / props / state.)

### 1. The door — horizontal corrugated slats (Req 1)

The door is built from **stacked slat rows**, not a single repeating gradient. Two viable techniques; the design uses **A** for crispness and per-slat control:

**Technique A — repeating background of a single tuned slat profile (vertical repeat):**
```css
.slats {
  background-image:
    /* one slat = top catch-light → body → bottom shadow → seam */
    repeating-linear-gradient(
      180deg,
      #0c0d0f 0px,        /* deep seam (groove between slats) */
      #1c1f24 2px,
      #33383f 9px,        /* slat body rising */
      #51575f 18px,       /* convex highlight ridge (light catches the curve) */
      #353b42 27px,
      #1a1d22 33px,
      #0c0d0f 35px        /* next seam — slat pitch = 35px */
    );
}
```
Each 35px band reads as a distinct horizontal slat with a rounded metallic ridge. Slat pitch scales down on mobile (≈26px).

**Cross-width sheen (premium black metal, Req 1.2):** a second layer adds a broad vertical light column so the steel looks cylindrical, brightest center-screen:
```css
background-image:
  repeating-linear-gradient(180deg, …slat profile…),
  linear-gradient(90deg,
    rgba(0,0,0,.45) 0%, rgba(255,255,255,.06) 30%,
    rgba(255,255,255,.14) 50%, rgba(255,255,255,.06) 70%, rgba(0,0,0,.45) 100%);
background-blend-mode: overlay, normal;
```

**Depth + hard shadow (Req 1.2):** `box-shadow: inset 0 -14px 22px rgba(0,0,0,.5), inset 0 10px 14px rgba(255,255,255,.05)` plus a solid black bottom edge.

**Red accent (Req 1.3):** a thin painted red band (`#CC0000`) runs across the door just above the sign, and the bottom rail carries a red pinstripe — deliberate detailing, not the dominant field.

### 2. The housing / drum (Req 1.4)
A dark bar pinned to the top of the hero (`position: absolute; top: 0; height: ~22px`) with a cylindrical gradient and a hard drop shadow. The slats visibly roll *into* it. This is what makes the door read as a real roller mechanism rather than a flat panel sliding away.

### 3. The bottom rail (Req 1.4)
A weighted aluminium bar at the door's base: lighter top edge, dark underside, a recessed grip slot (the handle), and a hard shadow beneath it. Gives the door visible mass.

### 4. The storefront sign — readable branding (Req 2)

This is the strongest element on the door. A **mounted sign panel**, not text painted flat into the metal:

```
┌─────────────────────────────┐
│  ████  U R B A N E X  ████   │   ← white wordmark, hard black shadow,
│        EST. STREETWEAR       │     on a red (#CC0000) sign plate with
└─────────────────────────────┘     white border + black hard shadow
```

- **Plate:** red `#CC0000` background, 3–4px white border, hard black `box-shadow` (matches `--shadow-*` language), slight bolt/rivet dots in the corners for the industrial-sign feel.
- **Wordmark:** `URBANEX` in Oswald 700, **white**, with a hard black text-shadow for contrast against the red. Massive letter-spacing for the storefront-sign look. This guarantees high contrast and 50%-zoom legibility (Req 2.2, 2.3).
- **Tagline:** `EST. STREETWEAR` in Bebas Neue, smaller, lower-emphasis cream/white (Req 2.5).
- Explicitly **never** dark-on-dark (Req 2.4).

Two alternatives are documented for the approval screenshots so the owner can pick:
- **Variant A — Red sign plate** (default above): boldest, most "shopfront."
- **Variant B — White stencil paint** directly on the metal: `URBANEX` as white spray-stencil with subtle edge texture, red underline accent. Cleaner/Kith-er.

### 5. Anticipation effects (Req 3)
All behind the door, subtle, GPU-cheap:
- **Light leaks:** the seam color in the slat gradient is lifted slightly + a low-opacity animated horizontal light line drifts down the seams (`opacity` pulse only).
- **Interior glow:** a warm radial gradient layer (`.glow`) sits *behind* the door at low opacity and slowly breathes (opacity 0.25↔0.4).
- **Product silhouette:** the hero's current featured product image is rendered behind the door at very low opacity + high contrast (a dark silhouette), so a shape is faintly sensed.
- **Spotlight warm-up:** the glow's center brightens slightly on a slow loop, implying the interior spotlight is coming on.
- None of these show a progress bar or spinner (Req 3.5).

### 6. Controls (Req 8.5, 9.2)
- **LIFT TO ENTER:** centered near the rail with a bobbing chevron; clicking lifts.
- **SKIP:** top-right, always visible, keyboard-focusable; completes instantly.
- Both fade out the moment `opening` begins.

---

## The Reveal Sequence (Req 4 & 5)

This is the centerpiece. Timeline (≈1.3s total), all `transform`/`opacity`:

| t (ms) | Door | Hero behind | Notes |
|---|---|---|---|
| 0 | engage: door dips ~1.5% down | — | "take up the slack" — sells weight |
| 0–700 | accelerates upward (translateY 0→ -98%) | product silhouette fades toward the real product; spotlight blooms | reveal begins progressively (Req 4.1) |
| 700–950 | overshoot to -103% into housing | hero typography `letterIn`/`maskUp` begin (they already exist) | overshoot = metal momentum (Req 5.2) |
| 950–1150 | settle back to -100.5% | CTAs activate + become interactive (Req 4.3) | tiny settle (Req 5.2) |
| 1150–1300 | optional 2-frame metallic shake | product card spotlight peaks (Req 4.4) | optional jolt (Req 5.3) |
| 1320 | overlay unmounts → state `open` | hero fully interactive (Req 6.3) | |

- The door's vertical travel uses a single `transform: translate3d(0, Y, 0)` keyframe with a weighted easing curve (`cubic-bezier(0.55,0.05,0.2,1)`) — **not** `scaleY` (which caused the "squash/PowerPoint" read) and **not** a linear slide.
- **transform-origin: top center** so the door rolls into the housing.
- The **spotlight** is a radial-gradient overlay that fades in over the product (`opacity`), timed to peak as the door clears the showcase tile.
- Hero typography/CTA "activation" reuses the hero's existing entrance animations — the shutter simply gates them by delaying the hero content's animation start until `opening` begins (via a CSS class on the section), so the reveal feels choreographed rather than the hero having already animated underneath.

### Animation safety
- All animated properties are `transform` and `opacity` only → GPU-composited, 60fps (Req 5.5, 7.1).
- `will-change: transform` on the door element only, cleared on unmount.
- No `width/height/top/left` animation → no layout shift / CLS (Req 6.4, 7.2).

---

## Hero Integration (Req 6)

- The shutter is conditionally rendered as the **last child** of the existing hero `<section>`; nothing in the existing JSX above it changes.
- It reads `current` (the active featured product index) from existing hero state to drive the silhouette — read-only, no new control over cycling.
- A single CSS class toggled on the section (`heroSealed`) holds the hero content's intro animations until the reveal starts; when the shutter is skipped/disabled, the class is never applied and the hero animates normally — guaranteeing zero behavioral change in the no-shutter path (Req 6.2).
- On `open`, the overlay returns `null`, so there are no leftover pointer-blocking layers (Req 6.3).

## Mobile (Req 7)

- Slat pitch and sign size scale down via the existing `@media (max-width: 768px)` block.
- Swipe-up gesture: `touchstart` records Y, `touchmove` lifts when Δy < −36px.
- No hover-dependent affordances; the bobbing chevron communicates "swipe up."
- Same GPU-only animation path; the heavy desktop background parallax is already disabled on mobile and is irrelevant under the shutter.

## Accessibility (Req 9)

- `prefers-reduced-motion: reduce` → `shouldPlayShutter()` returns false → state initialises to `open`, overlay never mounts, hero shown immediately, no animation.
- Overlay container: `role="dialog"` + `aria-label="UrbanEx store intro — press Skip to enter"`.
- SKIP and LIFT are real `<button>`s, focusable and Enter/Space operable.
- On `open`, focus is not trapped; normal document focus order resumes (Req 9.4).

---

## Data Models

The feature is presentational and holds only client-side UI state — no database models, no API changes.

### Shutter UI state (within `HeroBanner`)
```ts
type ShutterState = 'closed' | 'opening' | 'open';

interface ShutterRuntime {
  shutterState: ShutterState;        // drives render + CSS classes
  timers: number[];                  // tracked setTimeout ids for cleanup
  touchStartY: number | null;        // swipe-up gesture tracking
}
```

### Module-scoped gate (per document)
```ts
// module scope in HeroBanner.tsx — survives client-side navigation, resets on full load
let playedThisDocument = false;
```

### Trigger inputs (read-only, derived)
```ts
interface TriggerInputs {
  prefersReducedMotion: boolean;     // matchMedia('(prefers-reduced-motion: reduce)')
  isDevelopment: boolean;            // process.env.NODE_ENV !== 'production'
  navigationType: 'navigate' | 'reload' | 'back_forward' | 'prerender' | undefined;
}
```

### Read-only hero coupling
- `current: number` — existing hero state (active featured product index), consumed only to render the silhouette behind the door. The shutter never writes hero state.

---

## Correctness Properties

### Property 1: Reveal-layer invariant
When `shutterState === 'open'`, the overlay renders `null` and no element with a shutter class remains in the DOM (no leftover pointer-blocking layer).
**Validates: Requirements 6.3**

### Property 2: No-replay invariant
In production, for any sequence of client-side navigations back to `/` within one document load, the shutter plays at most once (`playedThisDocument` guards remounts).
**Validates: Requirements 8.4**

### Property 3: Refresh-plays invariant
A full document load with `navigation.type ∈ {navigate, reload}` in production, or any load in development, results in `shutterState` starting at `closed`.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 4: Reduced-motion invariant
If `prefers-reduced-motion: reduce`, `shutterState` initialises to `open` and no shutter animation ever runs.
**Validates: Requirements 9.1**

### Property 5: Termination invariant
The shutter always reaches `open` — via user action, the ~3s auto-lift, or instantly when not playing — so the hero can never be permanently obscured.
**Validates: Requirements 8.6**

### Property 6: Layout-stability invariant
Only `transform` and `opacity` animate; no property that triggers layout is animated, so CLS contribution is zero.
**Validates: Requirements 6.4, 7.2**

### Property 7: Timer-safety invariant
Every scheduled timeout is cleared on unmount; no state update fires after unmount.
**Validates: Requirements 6.3**

---

## Error Handling

- **Navigation Timing unavailable:** if `performance.getEntriesByType('navigation')` is empty/unsupported, default to playing on a true mount but respect the module played-flag (graceful: at worst it plays once).
- **Featured product image missing:** silhouette layer falls back to a neutral dark gradient; reveal still works.
- **Timer cleanup:** all `setTimeout`s are tracked in a ref and cleared on unmount to prevent state updates after unmount.
- **Private mode / storage errors:** no `sessionStorage` dependency, so no try/catch failure path needed for gating; any incidental storage use is wrapped.
- **Resize during open:** door uses percentage translate, so mid-animation resize stays proportional.

---

## Testing Strategy

- **Visual approval gate (Req 10):** before further refinement, produce screenshots of three states — **closed**, **mid-open** (door ~50% up, spotlight blooming), **fully revealed** (hero interactive) — for both branding variants (A: red sign plate, B: white stencil). No implementation refinement proceeds until a variant + look is approved.
- **Manual matrix:**
  - Dev refresh → plays every time.
  - Prod first visit → plays. Prod refresh → plays. Prod internal nav back to `/` → does not play. Category change → does not play.
  - Reduced-motion on → no animation, hero immediate.
  - Skip click + keyboard → instant open. Auto-lift after ~3s with no input.
  - Mobile swipe-up → lifts; verify no CLS via DevTools performance panel.
- **Performance:** DevTools performance recording during reveal confirms transform/opacity-only compositing and no long frames.
- **Regression:** confirm product cycling, category switch, CTAs, stat counters, ticker all behave identically after reveal.

---

## Open Decisions for Approval

1. **Branding variant:** A (red sign plate) vs B (white stencil paint). Default leans A for boldest shopfront read.
2. **Metallic shake at completion:** include the optional 2-frame jolt, or keep it to overshoot+settle only.
3. **Auto-lift delay:** 3s as specified, or slightly shorter (2.5s) so impatient users aren't waiting.
