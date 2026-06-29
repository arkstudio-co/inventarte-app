---
name: Dibujarte - Sistema de Inventario
description: Sistema de gestión de inventario para Dibujarte Editores
colors:
  primary: "#1A5F7A"
  primary-light: "#E8F0F4"
  primary-hover: "#134B61"
  primary-active: "#0E3A4D"
  accent: "#D4A04A"
  accent-light: "#F8F0E0"
  accent-hover: "#C08E38"
  surface: "#FFFFFF"
  surface-muted: "#F5F6F8"
  surface-raised: "#FFFFFF"
  ink: "#1E1E2E"
  ink-secondary: "#5A5B6E"
  ink-tertiary: "#9092A8"
  ink-muted: "#B8B9CC"
  border: "#E2E4E9"
  border-strong: "#C8CAD4"
  success: "#2E7D5C"
  success-light: "#E6F4EE"
  warning: "#D4943A"
  warning-light: "#FBF0E0"
  danger: "#C44040"
  danger-light: "#F9E6E6"
typography:
  display:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.875rem"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: label
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.primary}"
    padding: "10px 20px"
    typography: label
  button-secondary-hover:
    backgroundColor: "{colors.primary-light}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: label
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    padding: "10px 14px"
    typography: body
  input-focus:
    border: "1px solid {colors.primary}"
    boxShadow: "0 0 0 3px rgba(26, 95, 122, 0.12)"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.border}"
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
  card-hover:
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
  badge-default:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: label
  badge-success:
    backgroundColor: "{colors.success-light}"
    textColor: "{colors.success}"
  badge-warning:
    backgroundColor: "{colors.warning-light}"
    textColor: "{colors.warning}"
  badge-danger:
    backgroundColor: "{colors.danger-light}"
    textColor: "{colors.danger}"
---

# Design System: Dibujarte — La Galería Operativa

## 1. Overview

**Creative North Star: "La Galería Operativa"**

Cada pantalla es una galería donde los datos y productos se exhiben con claridad, orden y propósito. Como una galería de arte bien curada, el espacio negativo respira, la jerarquía guía la mirada, y cada elemento está donde debe estar porque tiene una razón de estar ahí.

Este sistema combina la solidez corporativa de una plataforma enterprise con la calidez de una empresa creativa. Los azules profundos aportan confianza y profesionalismo; el acento dorado/ámbar evoca el mundo del arte y la artesanía que define a Dibujarte Editores. Las superficies son limpias con sombras suaves que dan profundidad sin distraer.

**Key Characteristics:**
- Profesional con alma corporativa, no frío ni industrial
- Tarjetas y paneles con capas sutiles de elevación
- Jerarquía visual clara guiada por tipografía y color
- Blanco generoso como lienzo principal
- Acento dorado usado con precisión quirúrgica (≤10% de la superficie)
- Datos presentados como parte de la curaduría visual, no como tablas genéricas

## 2. Colors

Una paleta enterprise con calidez artesanal. El azul profundo (`#1A5F7A`) es el ancla visual: transmite confianza, profesionalismo y serenidad. El dorado (`#D4A04A`) es el acento que conecta con el mundo del arte y la creatividad, usado con moderación para no saturar.

### Primary
- **Deep Teal** (`#1A5F7A`): Color primario. Fondos de botones principales, encabezados de sección activos, enlaces, bordes de inputs en foco. Es el color que el usuario asocia con "acción" y "confianza".
- **Deep Teal Hover** (`#134B61`): Estado hover de elementos primarios.
- **Deep Teal Active** (`#0E3A4D`): Estado active/pressed.
- **Deep Teal Light** (`#E8F0F4`): Fondos de superficies tonales, badges informativos, hover de botones secundarios.

### Accent
- **Gold Amber** (`#D4A04A`): Acento primario. Logo, estrellas, iconos decorativos, badges destacados, indicadores de "completado" o "premium". Máximo 10% de cualquier pantalla. Su rareza es lo que le da poder.
- **Gold Amber Hover** (`#C08E38`): Hover sobre elementos accent.
- **Gold Amber Light** (`#F8F0E0`): Fondos sutiles de elementos destacados.

### Neutral
- **White** (`#FFFFFF`): Superficie principal (cards, modales, dropdowns).
- **Muted White** (`#F5F6F8`): Fondo de página, áreas de contenido secundario.
- **Light Gray** (`#E2E4E9`): Bordes de componentes, divisores.
- **Medium Gray** (`#C8CAD4`): Bordes más fuertes, separadores.
- **Ink** (`#1E1E2E`): Texto principal. Casi negro con un matiz ligeramente azulado para evitar el negro puro.
- **Ink Secondary** (`#5A5B6E`): Texto secundario, metadatos, placeholders.
- **Ink Tertiary** (`#9092A8`): Texto terciario, ayudas visuales, etiquetas pasivas.
- **Ink Muted** (`#B8B9CC`): Texto deshabilitado, decoración pasiva.

### Semantic
- **Success Green** (`#2E7D5C`): Estados exitosos, pagos completados, stock disponible.
- **Warning Amber** (`#D4943A`): Estados de advertencia, stock bajo, pendientes.
- **Danger Red** (`#C44040`): Errores, stock agotado, acciones destructivas.

**La Regla del Lienzo Blanco.** El fondo siempre es blanco o blanco matizado. La página es el lienzo; las tarjetas y paneles flotan sobre él. Nunca uses fondos de color sobre fondos de color.

**La Regla del Toque de Oro.** El dorado se usa en ≤10% de la pantalla. Es un acento, no un color de relleno. Si más del 10% de una pantalla es dorada, estás saturando el acento y perdiendo su poder.

## 3. Typography

**Display & Body Font:** Instrument Sans (con fallback system-ui, sans-serif)
**Mono Font:** JetBrains Mono (para datos, tablas, código)

**Carácter:** Una sans-serif limpia y profesional con un toque de calidez. Instrument Sans tiene la claridad de las geométricas pero con curvas ligeramente más humanas que evitan la frialdad corporativa típica.

### Hierarchy
- **Display** (700, `clamp(1.75rem, 4vw, 2.5rem)`, 1.15, -0.02em): Títulos de página y encabezados de sección principales. Solo una vez por vista.
- **Headline** (600, `clamp(1.25rem, 2.5vw, 1.5rem)`, 1.25, -0.01em): Títulos de sección secundarios, encabezados de tarjetas, títulos de modal.
- **Title** (600, `1rem`, 1.4): Nombres de productos, encabezados de listas, títulos de tabla.
- **Body** (400, `0.9375rem`, 1.6): Texto de contenido, descripciones, celdas de tabla. Máximo 75 caracteres por línea en prosa.
- **Label** (500, `0.8125rem`, 1.4, 0.02em): Etiquetas de formulario, badges, tabs, botones (en combinación con uppercase).
- **Mono** (400, `0.875rem`): Datos numéricos, SKUs, códigos, cantidades, IDs.

## 4. Elevation

El sistema usa un modelo de capas sutiles con sombras suaves para crear profundidad sin recurrir a fondos de colores contrastantes. La metáfora es de papeles flotando sobre un escritorio: cada capa es un papel ligeramente elevado.

### Shadow Vocabulary
- **Card Shadow** (`0 1px 3px rgba(0,0,0,0.04)`): Elevación base para todas las tarjetas en reposo.
- **Card Hover Shadow** (`0 4px 12px rgba(0,0,0,0.06)`): Tarjetas en hover, botones primarios.
- **Elevated Shadow** (`0 8px 24px rgba(0,0,0,0.08)`): Modales, menús desplegables, tooltips.
- **Sticky Shadow** (`0 2px 8px rgba(0,0,0,0.06)`): Headers y elementos sticky.

**La Regla de la Sombra Susurrante.** Las sombras son sutiles, nunca dramáticas. Si alguien nota la sombra antes que el contenido, la sombra es demasiado fuerte.

## 5. Components

### Buttons
- **Shape:** Ligeramente rectangulares con bordes suaves (6px radius). Profesionales pero no severos.
- **Primary (`button-primary`):** Deep Teal (`#1A5F7A`) sobre blanco. Padding 10x20px. Transición de 200ms ease en background.
- **Primary Hover:** Deep Teal Hover (`#134B61`), sombra sutil elevada.
- **Secondary (`button-secondary`):** Outline de Deep Teal sobre fondo transparente. Mismo padding que primary. Hover: fondo Deep Teal Light.
- **Ghost (`button-ghost`):** Sin borde ni fondo. Texto Ink Secondary. Hover: fondo Muted White.
- **Danger:** Danger Red (`#C44040`) sobre blanco. Misma estructura que primary.

### Inputs & Fields
- **Style:** Borde sólido de 1px Light Gray (`#E2E4E9`), fondo blanco, bordes de 6px. Padding interno 10x14px.
- **Focus:** El borde cambia a Deep Teal con un glow sutil (box-shadow de 3px con 12% de opacidad del primary). Transición suave de 200ms.
- **Error:** Borde Danger Red con glow rojo sutil. Mensaje de error abajo en Label con Danger Red.
- **Disabled:** Fondo Muted White, texto Ink Muted, borde Light Gray.

### Cards & Containers
- **Corner Style:** 8px (lg). Profesional sin ser redondo.
- **Background:** White (`#FFFFFF`) con borde de 1px Light Gray.
- **Shadow Strategy:** Sombra base (`0 1px 3px rgba(0,0,0,0.04)`) en reposo. Sombra hover (`0 4px 12px rgba(0,0,0,0.06)`) en interacción.
- **Internal Padding:** 24px (lg) estándar. Versión compacta: 16px (md).

### Badges & Chips
- **Style:** Bordes completamente redondos (9999px), padding horizontal 10px, vertical 2px. Label typography.
- **Default:** Muted White + Ink Secondary.
- **Success:** Success Light + Success Green.
- **Warning:** Warning Light + Warning Amber.
- **Danger:** Danger Light + Danger Red.

### Navigation (Sidebar)
- **Style:** Fondo Muted White, ancho 240px. Ícono + label por item.
- **Default:** Texto Ink Secondary, ícono en modo outline.
- **Active:** Fondo Deep Teal Light, texto Deep Teal, ícono en modo filled.
- **Hover:** Fondo Muted White más oscuro (hover).

### Tables
- **Style:** Sin bordes verticales. Borde horizontal inferior 1px Light Gray entre filas.
- **Header:** Fondo Muted White, texto Label en Ink Secondary, uppercase.
- **Row Hover:** Fondo sutil ligeramente más oscuro que el blanco.
- **Sticky Header:** Sombra sticky (`0 2px 8px rgba(0,0,0,0.06)`).

## 6. Do's and Don'ts

### Do:
- **Do** usar Deep Teal como color primario de acción en botones, enlaces y elementos interactivos.
- **Do** mantener el dorado como un acento escaso y deliberado (≤10% de la pantalla).
- **Do** usar tarjetas blancas con sombras suaves para contener información relacionada.
- **Do** aprovechar el espacio en blanco como herramienta de jerarquía visual.
- **Do** usar Instrument Sans para todo el texto, con JetBrains Mono exclusivamente para datos técnicos.
- **Do** mantener una transición de 200ms ease en todos los estados interactivos (hover, focus).
- **Do** usar la sombra correcta según el nivel de elevación del componente.

### Don't:
- **Don't** usar gradientes púrpura, fondos crema por defecto, o glassmorphism decorativo.
- **Don't** usar tipografía Inter como default (es la señal más obvia de "AI slop").
- **Don't** poner bordes decorativos left/right mayores a 1px como acento en tarjetas.
- **Don't** usar texto gris claro sobre fondos de color — siempre usa una variante más oscura del mismo tono.
- **Don't** anidar tarjetas dentro de tarjetas.
- **Don't** usar bounce o elastic easing en animaciones.
- **Don't** usar sombras dramáticas o grandes — si se nota la sombra antes que el contenido, es muy fuerte.
- **Don't** usar el dorado como color de relleno en áreas grandes.
- **Don't** usar texto gradient (background-clip: text con gradiente).
