# Requirements Document

## Introduction

UrbanEx is a premium streetwear / sneaker boutique. This feature adds a **reveal layer** over the existing homepage hero: an industrial roller shutter — like the metal storefront door of a real boutique — that the visitor "opens" to reveal the hero behind it.

The intent is both **emotional and decorative**. Emotionally, the visitor should feel **"I just opened the UrbanEx store,"** not **"I watched a loading animation."** Decoratively, the shutter is a deliberate brand statement — a premium, beautifully crafted storefront object that elevates the homepage's visual identity even in still frames. Three prior attempts were rejected for reading as a generic striped loading screen, a gaming intro, or a graffiti simulator with unreadable branding. This spec exists to lock the concept before any further implementation.

The shutter is **only a reveal layer**. The existing hero (`HeroBanner.tsx` + `HeroBanner.module.css`) — product cycling, category switching, CTA logic, featured-product showcase, stat counters, ticker — is preserved in full and revealed, never replaced.

### Design language (must match the existing site)
- Comic-book hard shadows: solid black, zero blur (`--shadow-*` tokens)
- Fonts: Oswald, Bebas Neue, Permanent Marker
- Palette: off-white `#F7F6F3`, crimson red `#CC0000`, sticker yellow `#F5C400`, 3px solid black borders
- Reference feel: Nike-level confidence, Kith-level cleanliness

### Explicitly out of scope / forbidden aesthetics
- Generic dark striped backgrounds
- Gaming intro screens
- Cheap graffiti / cartoon spray / excessive paint drips
- PowerPoint-style slide transitions
- Dark-gray-on-dark (unreadable) branding

## Glossary

- **Shutter**: The industrial roller-door overlay rendered over the hero in its closed state.
- **Reveal layer**: The shutter overlay; it covers and then uncovers the hero but is never the hero itself.
- **Hero**: The existing `HeroBanner` component (product cycling, category switching, CTAs, featured-product showcase, stat counters, ticker).
- **Slat**: A single horizontal metal panel of the roller door; many stacked vertically form the door.
- **Housing / drum**: The dark bar at the top of the hero that the slats visually roll up into.
- **Bottom rail**: The weighted aluminium bar at the base of the door that carries the lift handle.
- **Reveal sequence**: The choreographed activation of product, typography, CTAs, and spotlight as the door opens.
- **Closed / Opening / Open**: The three shutter states. Open = hero fully interactive, overlay removed.
- **Auto-lift**: Automatic opening after ~3s when the visitor takes no action.
- **Internal navigation**: Client-side route changes within the SPA (e.g. returning from a product page), as opposed to a full browser refresh or first visit.

---

## Requirements

### Requirement 1: Industrial roller shutter visual

**User Story:** As a visitor, I want the homepage to be covered by a realistic metal storefront shutter, so that arriving feels like standing in front of a real boutique before it opens.

#### Acceptance Criteria
1. WHEN the homepage loads in the closed state THEN the shutter SHALL render as a corrugated metal roller door with **horizontal slats stacked vertically** (never vertical ribs that read as a barcode).
2. THE shutter SHALL present a premium black/graphite metal finish with visible slat seams, convex per-slat highlights, and strong depth via hard shadows consistent with the site's `--shadow-*` tokens.
3. THE shutter SHALL include UrbanEx red (`#CC0000`) accents as deliberate detailing (e.g. a painted band, sign frame, or edge trim), not as the dominant field.
4. THE shutter SHALL read as a **physical object** (slats, a top housing/drum, a weighted bottom rail) and SHALL NOT read as a flat repeating background texture.
5. THE shutter SHALL NOT use graffiti tags, paint drips, cartoon spray effects, or gaming-style visuals.
6. THE shutter SHALL occupy only the hero area; the site header SHALL remain visible and interactive above it.

### Requirement 2: Readable storefront branding

**User Story:** As a visitor, I want the UrbanEx name to be the first thing I read on the shutter, so that the brand registers instantly before the store even opens.

#### Acceptance Criteria
1. THE UrbanEx logo/wordmark SHALL be the strongest visual element on the closed shutter.
2. THE branding SHALL be high-contrast and instantly readable — implemented as white stencil paint, a red-and-white storefront sign, or an illuminated industrial sign (not low-contrast embossing).
3. THE branding SHALL remain clearly legible at 50% browser zoom and at a glance "from across the room."
4. THE branding SHALL NOT be dark-gray text on a dark background, low-contrast, or hidden inside shadows.
5. WHERE a tagline accompanies the wordmark THE tagline SHALL be secondary in weight and SHALL NOT compete with the wordmark's legibility.

### Requirement 3: Anticipation before opening

**User Story:** As a visitor, I want subtle signs of life behind the closed shutter, so that I feel the store is about to open rather than that the page is frozen.

#### Acceptance Criteria
1. WHILE the shutter is closed THE system SHALL show light leaking through the slat seams.
2. WHILE the shutter is closed THE system SHALL show a faint interior glow behind the shutter.
3. WHILE the shutter is closed THE system SHALL show a faint silhouette of the featured product behind the door.
4. WHILE the shutter is closed THE system SHALL begin subtly activating a spotlight and convey a small sense of movement behind the door.
5. THE anticipation effects SHALL be subtle and SHALL NOT obscure the branding or imply a loading/progress state.

### Requirement 4: The reveal sequence

**User Story:** As a visitor, I want opening the shutter to feel like a curated unveiling of today's drop, so that the first impression is premium and intentional.

#### Acceptance Criteria
1. WHEN the shutter opens THE featured product SHALL become progressively visible as the door clears it (not a hard cut).
2. WHEN the shutter clears the hero THE hero typography SHALL activate (animate in) in sequence.
3. WHEN the shutter clears the hero THE CTA buttons SHALL activate and become interactive.
4. WHEN the product is revealed THE product card SHALL receive a spotlight emphasis.
5. THE reveal SHALL feel premium and intentional and SHALL NOT resemble a generic slide transition.

### Requirement 5: Mechanical opening animation

**User Story:** As a visitor, I want the shutter to move like real heavy metal, so that the interaction feels physical and satisfying.

#### Acceptance Criteria
1. WHEN the shutter opens THE door SHALL roll upward into its top housing with smooth, mechanical motion conveying metal weight.
2. THE opening motion SHALL include a small overshoot followed by a tiny settling movement at completion.
3. THE opening MAY include a subtle metallic shake/jolt at completion as an optional emphasis.
4. THE animation SHALL NOT be a PowerPoint-style slide, a generic linear slide reveal, or an exaggerated bounce.
5. THE animation SHALL use GPU-composited properties only (transform + opacity) and SHALL maintain 60fps.

### Requirement 6: Hero integration (reveal layer only)

**User Story:** As the store owner, I want the shutter to wrap the existing hero without changing it, so that no existing functionality is lost.

#### Acceptance Criteria
1. THE shutter SHALL be implemented as an overlay layer over the existing hero and SHALL NOT replace or fork the hero component's logic.
2. THE existing hero functionality — product cycling, category switching, CTA logic, featured-product showcase, stat counters, ticker — SHALL remain fully intact after the reveal.
3. WHEN the reveal completes THE hero SHALL be fully interactive with no leftover overlay blocking pointer events.
4. THE shutter SHALL NOT alter the hero's layout, height, or scroll behavior (no layout shift introduced).

### Requirement 7: Mobile experience

**User Story:** As a mobile visitor, I want the shutter to feel premium and fast on my phone, so that it impresses without getting in my way.

#### Acceptance Criteria
1. THE shutter SHALL render and animate using GPU-accelerated transform/opacity only on mobile, with no jank or dropped frames.
2. THE shutter SHALL introduce no layout shift (no CLS) on any viewport.
3. WHEN a mobile user swipes up on the shutter THEN the shutter SHALL lift.
4. THE mobile reveal SHALL feel premium without becoming annoying or slow on repeat interactions within a session.

### Requirement 8: Trigger behavior

**User Story:** As a visitor, I want the shutter to play at the right moments only, so that it's a memorable arrival rather than a repeated obstacle.

#### Acceptance Criteria
1. WHEN running in development mode THE shutter SHALL play on every page refresh and SHALL ignore any session flag.
2. WHEN running in production AND it is the visitor's first visit THE shutter SHALL play.
3. WHEN running in production AND the visitor performs a full browser refresh THE shutter SHALL play.
4. WHEN the visitor navigates internally (SPA navigation), returns from a product page, or changes a category THE shutter SHALL NOT play.
5. WHILE the shutter is closed or opening THE system SHALL display a Skip control that immediately completes the reveal.
6. IF no interaction occurs THEN the shutter SHALL auto-lift after approximately 3 seconds so the visitor is never stuck.

### Requirement 9: Accessibility

**User Story:** As a visitor using assistive technology or reduced-motion settings, I want the reveal to respect my preferences, so that the site remains usable and comfortable.

#### Acceptance Criteria
1. IF the user has `prefers-reduced-motion: reduce` THEN the shutter SHALL render in the open state instantly with no animation.
2. THE Skip control SHALL be keyboard focusable and operable via keyboard.
3. THE shutter overlay SHALL expose appropriate ARIA roles/labels describing it as an intro that can be dismissed.
4. WHEN the reveal completes THE focus order SHALL return to the normal page content.

### Requirement 10: Visual approval gate

**User Story:** As the store owner, I want to approve the look before more engineering happens, so that we don't iterate blindly again after three rejected attempts.

#### Acceptance Criteria
1. AFTER the design phase THE work SHALL produce screenshots of three states: **closed shutter**, **mid-open**, and **fully revealed**.
2. THE implementation SHALL NOT proceed to full refinement until the visual concept is explicitly approved by the store owner.
3. IF the concept is not approved THEN the design SHALL be revised and new screenshots produced before any further implementation.
