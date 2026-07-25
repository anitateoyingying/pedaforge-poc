# PedaForge Design System

## Direction

**Style:** Clay-Neumorphic Hybrid
**Tone:** Professional, warm, approachable (Early Childhood Education context)
**Brand:** Busy Bees Singapore (Red #e8063c, Yellow #fecd1b)

---

## Foundation

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#e8063c` | CTAs, highlights, brand red |
| `--primary-dark` | `#c80534` | Hover states |
| `--primary-light` | `#f44068` | Gradients |
| `--secondary` | `#2D2A5E` | Deep purple, headings, dark panels |
| `--secondary-light` | `#773E8B` | Purple accents |
| `--accent` | `#fecd1b` | Golden yellow highlights |
| `--accent-light` | `#ffe066` | Light yellow |
| `--accent-warm` | `#FF9E18` | Warm orange |
| `--bg` | `#faf6f0` | Page background (warm beige) |
| `--bg-card` | `#ffffff` | Card surfaces |
| `--bg-dark` | `#1a1535` | Dark sections, CTA panels |
| `--text` | `#3d3e3f` | Primary text |
| `--text-light` | `#6b7280` | Secondary text |
| `--text-muted` | `#9ca3af` | Tertiary/meta text |
| `--border` | `#e8e4dd` | Card borders, dividers |
| `--success` | `#10b981` | Positive indicators |
| `--warning` | `#FF9E18` | Caution indicators |
| `--danger` | `#dc2626` | Alerts, critical |
| `--info` | `#3b82f6` | Informational |

**Opacity scale:** Primary red used at 0.02-0.35 opacity for tinted backgrounds. White overlays at 0.1-0.9 for clay layering.

### Typography

| Role | Family | Notes |
|------|--------|-------|
| Headings | Playfair Display, serif | Elegant, editorial feel |
| Body | Outfit, sans-serif | Single-story 'a', clean, modern |
| Code | JetBrains Mono / Fira Code, monospace | Architecture diagrams, code blocks |

**Size Scale:**

| Level | Size | Usage |
|-------|------|-------|
| Micro | 0.65-0.75rem | Tiny labels, badge text |
| Small | 0.8-0.9rem | Meta text, secondary content |
| Standard | 0.95-1.05rem | Body text, navigation |
| Medium | 1.1-1.25rem | Subheadings |
| Large | 1.5-1.8rem | Card titles, stat values |
| XL | 2-2.4rem | Section headers |
| XXL | 2.8-3.2rem | Hero text |

### Spacing

**Base unit:** 8px

| Token | Value | Usage |
|-------|-------|-------|
| 0.5x | 4px | Tight gaps, inline spacing |
| 1x | 8px | Default gap, small padding |
| 1.5x | 12px | Medium gap |
| 2x | 16px | Standard padding |
| 2.5x | 20px | Card padding (small) |
| 3x | 24px | Card padding (standard) |
| 4x | 32px | Section spacing |
| 5x | 40px | Large section spacing |
| 7.5x | 60px | Section vertical padding |
| 10x | 80px | Hero section padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 14px | Buttons, inputs, chips, pills |
| `--radius` | 20px | Cards, panels, containers |
| `--radius-lg` | 32px | Hero containers, modals |
| pill | 100px | Badges, tags, labels |
| circle | 50% | Avatars, icon containers |

### Depth (Shadows)

**Strategy:** Borders-primary (38 border vs 20 shadow declarations). Clay-neumorphic multi-layer shadows for elevation.

| Token | Layers | Usage |
|-------|--------|-------|
| `--shadow` | 4-layer: drop + reverse + 2x inset | Default card elevation |
| `--shadow-md` | 4-layer: stronger offsets | Hover/active states |
| `--shadow-lg` | 4-layer: maximum depth | Modal/hero containers |

Shadow formula: offset drop (dark, low opacity) + reverse light + inset highlight + inset subtle dark

---

## Patterns

### Button

```
Base:     padding 12px 24px, radius 14px, font-weight 600, font-size 0.95rem
Small:    padding 8px 16px, font-size 0.85rem
Large:    padding 16px 32px, font-size 1.05rem
Primary:  gradient(135deg, #f44068, #e8063c), white text, clay shadow
Secondary: white bg, 1px border, dark text
Accent:   gradient(135deg, #fecd1b, #ffe066), purple text
Animation: cubic-bezier(0.34, 1.56, 0.64, 1) (bouncy)
Hover:    translateY(-1px to -2px)
Active:   scale(0.95), inset shadow
```

### Card

```
Background: var(--bg-card) white
Border:     1px solid var(--border)
Radius:     var(--radius) 20px
Padding:    20-36px (varies by card type)
Hover:      translateY(-4px to -6px), shadow-md, border-primary-tint
```

Card variants: feature-card (36px pad), problem-card (32px pad), team-card (28px pad, centered), kpi-card (32px 24px pad, centered), observation-card (20px pad).

### Badge / Tag

```
Padding:      4px 12px to 6px 16px
Radius:       100px (full pill)
Font-size:    0.75-0.8rem
Font-weight:  600-700
Background:   rgba tint of semantic color (0.1-0.15 opacity)
Color:        matching semantic color
```

Tag variants: tag-framework (red), tag-ai (purple), tag-data (blue).

### Panel

```
Background: var(--bg-card) white
Border:     1px solid var(--border)
Radius:     var(--radius) 20px
Padding:    20-24px
Heading:    inline SVG icon (18px) + h3
```

CTA variant: gradient dark purple background, white text.

### Icon Container

```
Size:       32-56px square
Radius:     var(--radius-sm) or 50%
Display:    flex, centered
Background: rgba([semantic-color], 0.1)
Color:      matching semantic color
Icon style: Feather/Lucide SVG line icons (stroke-based, viewBox 0 0 24 24)
```

### Chip (Selectable)

```
Padding:    10px 14px
Background: var(--bg) beige
Border:     1px solid var(--border)
Radius:     var(--radius-sm) 14px
Selected:   border primary, bg rgba(primary, 0.08)
Count:      100px pill, primary tint bg
```

### Alert / Status Item

```
Padding:    14px 16px
Background: var(--bg) beige
Border:     1px solid var(--border)
Border-left: 3px solid semantic color (severity stripe)
Radius:     var(--radius-sm) 14px
Hover:      translateX(2px)
Variants:   critical (red tint, red stripe), warning (orange tint, orange stripe), info (blue tint, blue stripe)
```

### Status Badge

```
Padding:      2px 10px
Radius:       100px (full pill)
Font-size:    0.75rem
Font-weight:  600
Background:   rgba([semantic-color], 0.1)
Color:        matching semantic color
Variants:     on-track (green), needs-support (orange), exceeding (blue), new-educator (gray)
```

### PD Card (Professional Development)

```
Padding:    16px
Background: var(--bg) beige
Border:     1px solid var(--border)
Radius:     var(--radius-sm) 14px
Hover:      border rgba(primary, 0.2), subtle box-shadow
Contains:   .pd-title (0.9rem, 600, secondary), .pd-code (0.75rem, muted), .pd-for (0.8rem, text-light), button
```

### Stat Row (Key-Value List)

```
Layout:     flex, space-between
Padding:    12px 0
Separator:  1px solid var(--border) (bottom, none on last)
Hover:      rgba(primary, 0.02) background, slight horizontal pad expansion
Label:      0.9rem, text-light
Value:      1.05rem, 700, secondary
```

### QTT Bar Chart

```
Layout:       CSS Grid, repeat(6, 1fr), gap 10px
Track:        40px wide, 140px tall, var(--border) bg, 8px radius, overflow hidden
Fill:         absolute positioned from bottom, semantic color bg, 8px top-radius
Value label:  0.8rem, 700, colored to match bar (not generic text color)
Domain label: 0.7rem, text-light, centered, max-width 72px
Mobile:       3-column grid at 600px, 100px track height
```

### Stat Card (Dashboard Hero)

```
Background: var(--bg-card) white
Border:     1px solid var(--border)
Radius:     var(--radius) 20px
Padding:    20px
Shadow:     var(--shadow) (clay, elevated above panels)
Hover:      translateY(-2px), shadow-md
Label:      0.8rem, uppercase, muted, 0.5px letter-spacing
Value:      1.8rem, 700, secondary (Playfair Display)
Change:     0.8rem, semantic color (success/danger)
```

### Progress Roundel (SVG)

```
Size:         80x80 SVG
Circle r:     36, cx/cy: 40
Stroke-width: 6px
Track:        var(--border)
Fill:         semantic color (success/warning/danger/info)
Circumference: 226.19 (2 * PI * 36)
Center text:  percentage value
```

---

## Animation

| Property | Value | Usage |
|----------|-------|-------|
| Default transition | 0.3s ease | Most hover states |
| Button bounce | 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) | Button interactions |
| Bar/chart grow | 0.8s cubic-bezier(0.4, 0, 0.2, 1) | Data visualization |
| Scroll reveal | 0.6s ease | Scroll-triggered animations |
| Card hover lift | translateY(-4px) | Card hover state |
| Active press | scale(0.95) | Button/card active |

---

## Z-Index Hierarchy

| Level | Value | Element |
|-------|-------|---------|
| Background | -1 | .bg-blobs |
| Content | 0 | Cards, panels, default |
| Floating | 999 | Back-to-top button |
| Navigation | 1000 | .navbar |
| Overlay | 1001 | .scroll-progress |

---

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| 1024px | Tablet landscape |
| 768px | Tablet portrait |
| 600px | Large phone |
| 480px | Small phone |

---

## Icons

**Style:** Feather/Lucide SVG line icons
**Attributes:** stroke="currentColor", stroke-width="2", stroke-linecap="round", stroke-linejoin="round", fill="none", viewBox="0 0 24 24"
**Sizes:** 16px (inline), 18px (panel headings), 24px (standalone)
