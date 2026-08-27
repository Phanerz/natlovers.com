
Fill every `___` from your actual product palette (Agel / Water Hyacinth / Gajih / Woven Fabric / Patchwork). Do not use placeholder or borrowed brand colors  -  the palette already exists in the codebase.

## 3. Typography Rules
- **Headlines:** editorial serif, weight 400–500. Pick one and commit  -  don't default to Inter or system fonts.
- **Body:** humanist sans, weight 400, 16–17px, line-height 1.6.
- **UI/labels:** same sans, medium weight, 14px.

Scale: 13 / 15 / 17 / 20 / 26 / 36 / 52. Avoid weights above 600.

## 4. Component Stylings

**Glass scope  -  read carefully, this is deliberately narrow**

Liquid glass (blur, refraction, soft continuous radius) applies ONLY to:
- Primary buttons / CTAs (`.glass-btn-primary` and equivalent)
- Featured/highlight cards explicitly marked as such (e.g. hero product cards, custom-studio preview cards)  -  NOT every card, NOT list/grid cards, NOT form containers

Everything else  -  nav, inputs, standard product cards, containers, tables, footers  -  stays flat warm-editorial: 1px border, `--surface` fill, radius 6–8, no blur, subtle shadow only where noted in section 6.

**Glass elements themselves**
- Radius: continuous/superellipse curve, larger than the flat-editorial scale (16–24 range is fine here  -  glass needs room to read as glass)
- Shadow: soft, warm-tinted, larger blur radius than flat elements  -  glass is the one place heavier shadow is correct, because it's selling depth/refraction, not decoration
- Backdrop-filter blur + saturate, as currently implemented
- Keep the accent color consistent with the rest of the palette  -  don't let glass introduce its own color language (no cold blue/cyan tints, stay warm)

**Everything NOT in the glass scope**
- Buttons (secondary): `--surface` fill, 1px `--border`, radius 6–8, padding 10/18, weight 500
- Cards / product tiles: `--surface` fill, 1px `--border`, radius 8. Flat by default, no blur.
- Inputs: 1px `--border`, radius 6, padding 10/14. Focus: 2px `--accent` outline, 2px offset. No glow.
- Pills / badges: keep full radius regardless of the rest of this section  -  pills are exempt from the "less rounded" rule entirely.

## 5. Layout Principles
- Max 680px for editorial/story content, 1180px for shop/catalogue shells.
- Vertical rhythm: generous, 64–96px section breaks.
- Product photography carries the page  -  leave room around it, don't crowd with UI chrome.

## 6. Depth & Elevation
Flat by default. Depth from surface color shifts and 1px borders, not shadows.
Where a shadow is used on non-glass elements (modals, dropdowns): keep it subtle  -  `0 4px 12px rgba(0,0,0,0.06)` range, nothing heavier.
Glass elements (section 4) keep their existing heavier, warm-tinted shadow  -  that's correct for the effect, don't flatten it.

## 7. Do's and Don'ts

**Do**
- Let product photography and material texture carry visual weight.
- Use serif for editorial moments (founder story, artisan profiles, provenance copy).
- Name real materials and techniques in copy, not generic marketing language.
- Reserve glass for the moments defined in section 4  -  primary CTAs and featured cards only.

**Don't**
- Use cold blues or neutral tech-grays  -  everything bends warm, toward the natural fiber tones.
- Apply glass/blur effects outside the defined scope  -  no glass on standard cards, nav, inputs, or containers.
- Use heavy shadows or oversized border-radius on anything outside the glass scope.

## 8. Responsive Behavior
- Single column mobile, generous padding.
- Product grid: 2-up mobile, 3–4-up desktop.
- Tables (if any, e.g. sizing/materials) stack to cards below 640px.
- Glass elements: keep blur, reduce intensity slightly on mobile if performance requires it.

## 9. Agent Prompt Guide
Bias: warm cream base, real material-derived accent colors, editorial serif for storytelling moments, flat surfaces by default, restrained radius, product photography-first layouts, glass reserved for primary buttons and featured cards only.

Reject: cold neutral palettes, glassmorphism applied broadly across the site, teal/purple default accents, generic SaaS card-grid layouts, dark-mode-first.

## Anti-Slop Rules

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (purple gradients on white or dark backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
- Three-column feature grid as the default hero layout
- Containers nesting more than 2 levels deep
- Glassmorphism applied outside the defined glass scope (buttons/featured cards only)  -  glass everywhere is the generic tell, glass as a deliberate accent is not

DO use:
- Unique fonts chosen for the brand, not defaults
- Cohesive colors and themes grounded in the product's story
- Animations for effects and micro-interactions
- Context-specific character in every component