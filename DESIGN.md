# UrbanEx — Graffiti Concrete Design System

## 1. Visual Philosophy

**Aesthetic**: Raw urban street art. Inspired by NYC subway graffiti walls, skate culture stickers, and bold black marker tags on aged concrete. The logo — chunky bubble graffiti letters with thick black outlines on a concrete wall — defines the entire visual language.

**Core Metaphor**: The website is a **concrete wall** the user walks past. Content is spray-painted, stickered, and tagged directly onto the surface.

**Form Language**:
- `0px` border radius everywhere — hard edges, no softness
- `4px solid #111111` borders — thick black marker outlines
- Flat 2D offset block shadows (`6px 6px 0 #111111`) — no blur, no glow
- Rotated sticker tags for badges and labels
- Hard white fill on spray-painted shapes

## 2. Color Palette

| Role | Value | Usage |
|---|---|---|
| **Background (concrete)** | `#D6D2C9` | Main page surface — aged raw concrete |
| **Secondary BG (paper)** | `#F0EDE6` | Cards and containers — lighter concrete/paper |
| **Tertiary BG** | `#C2BDB3` | Shadowed concrete — inner panels |
| **Dark** | `#1A1A1A` | Black marker, dark sections |
| **Accent Primary** | `#FF5500` | Spray-paint orange — the ONE vivid color |
| **Accent Secondary** | `#E04800` | Darker orange for hover states |
| **Tag Yellow** | `#CCFF00` | Lime sticker/tag labels |
| **Text Primary** | `#111111` | Black marker ink |
| **Text Secondary** | `#444444` | Faded ink |
| **Text Muted** | `#777777` | Chalk dust text |
| **Text Light** | `#F5F2EB` | White chalk on dark backgrounds |

## 3. Typography

### Display / Logo
- **`'Black Ops One'`** — condensed military stencil style; used for all large headings, hero title, section headers
- Applied with `-webkit-text-stroke` and `text-shadow` offset for graffiti marker effect

### Sticker / Tags
- **`'Permanent Marker'`** — hand-written feel; used for subtitles, badges, sticker labels, casual notes

### Headings
- **`'Bebas Neue'`** — tight all-caps; used for nav links, button text, secondary headings
- Letter-spacing: `2px` to `4px`

### Body
- **`'Inter'`** — clean readable; used for product names, descriptions, prices

## 4. Shadow & Border System

```css
--border:       4px solid #111111;   /* Thick marker outline */
--border-thin:  2px solid #111111;   /* Thin marker */
--shadow:       6px 6px 0px #111111; /* Standard block shadow */
--shadow-lg:    8px 8px 0px #111111; /* Large block shadow */
--shadow-hover: 2px 2px 0px #111111; /* Pressed state */
--shadow-lift:  10px 10px 0px #111111; /* Elevated/hover state */
```

## 5. Signature UI Elements

### Sticker Tags
Diagonal badges rotated `-1.5deg` to `-3deg`, lime yellow background, marker border, block shadow. Used for "NEW DROP", "SALE", code badges.

### Marquee Tape
Dark black strip between sections scrolling category names — like caution tape or a roller-painted wall.

### Category Headers
Full-width dark concrete panel headers for each product section. Black Ops One text on dark `#1A1A1A` background.

### Corner Accent
Triangular orange corner on product cards on hover — like a spray tag corner.

## 6. Animation Philosophy

All animations feel physical and immediate:
- **`sprayIn`** — content appears by spraying in from the left
- **`tagWobble`** — sticker tags wobble ±2.5deg like they're freshly pasted
- **`stickerPeel`** — cards lift + rotate slightly on hover, like peeling a sticker
- **`marqueeScroll`** — continuous horizontal scroll like a painted band
- **`flyerPost`** — popup enters with rotate + scale like a flyer being posted
- **`floatBob`** — background elements gently bob
- No easing that looks digital or smooth — everything should feel physical
