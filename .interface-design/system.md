# Dibujarte — Interface Design System

## Direction & Feel
Warm, precise, taller de arte. Papel-tinta-grafito. Herramienta de inventario con personalidad artesanal.

## Depth Strategy
**Borders-only.** Sin sombras. Bordes rgba sutiles para definir jerarquía.

## Color Palette
- `--paper` (#F5F0E8) — Base canvas, fondo cálido
- `--ink` (#1A1A1A) — Texto principal, alto contraste
- `--tint` (#C4A35A) — Acento principal (acción, active, branding)
- `--accent` (#2C5F7A) — Azul tinta para links y focus
- `--danger` / `--success` / `--warning` — Semánticos

## Surface Elevation
- `--surface-0` (paper) — Base canvas
- `--surface-1` (paper-elevated) — Cards, paneles
- `--surface-2` — Hover, inputs
- `--surface-overlay` (white) — Modals, dropdowns

## Border Scale
- Default: `rgba(26, 26, 26, 0.08)`
- Subtle: `rgba(26, 26, 26, 0.04)`
- Strong: `rgba(26, 26, 26, 0.16)`
- Focus: `rgba(44, 95, 122, 0.4)`

## Spacing Base
**4px.** Scale: 1(4), 2(8), 3(12), 4(16), 5(20), 6(24), 8(32), 10(40), 12(48), 16(64).

## Typography
- UI: Geist/Inter (sans-serif)
- Data: JetBrains Mono (mono, tabular-nums)
- Hierarchy: 4 niveles (primary, secondary, tertiary, muted)

## Border Radius
- Sm: 4px (buttons, inputs)
- Md: 8px (cards, panels)
- Lg: 12px (modals, containers)

## Key Components

### Button Primary
- Height: 36px (md)
- Padding: 16px 16px (md)
- Radius: 4px
- Font: 14px, 500 weight
- Bg: `--tint`, Hover: `--tint-hover`
- Border: `--border-default`

### Input
- Bg: `--surface-1`
- Border: `--border-default`
- Focus: `--accent` + ring `--border-focus`
- Padding: 12px 8px
- Radius: 4px
- Placeholder: `--ink-muted`

### Card
- Bg: `--surface-1`
- Border: `--border-default`
- Radius: 8px
- Padding: 16px
- Hover: `--surface-2`/50

### Sidebar
- Bg: `--surface-0` (same as canvas)
- Border-right: `--border-default`
- Width: 256px
- Active item: `--tint-light` + `--tint`/30 border

## Navigation
Sidebar mismo fondo que canvas. Separación solo con borde. Ítem activo destacado con fondo tint-light y borde tint.

## Signature Element
**Trazo de grafito/pincel** — líneas decorativas sutiles en separadores y active nav. No implementado aún como elemento visual, pero la paleta cálida y las texturas de papel logran el mismo efecto.
