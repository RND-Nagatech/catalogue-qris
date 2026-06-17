---
name: Luminous Fintech
colors:
  surface: '#031428'
  surface-dim: '#031428'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f22'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364b'
  on-surface: '#d3e3ff'
  on-surface-variant: '#bec9c6'
  inverse-surface: '#d3e3ff'
  inverse-on-surface: '#213146'
  outline: '#889390'
  outline-variant: '#3e4947'
  surface-tint: '#85d5c9'
  primary: '#85d5c9'
  on-primary: '#003732'
  primary-container: '#00685f'
  on-primary-container: '#93e4d8'
  inverse-primary: '#066a61'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c1'
  on-secondary-container: '#b0b2ff'
  tertiary: '#fcba66'
  on-tertiary: '#472a00'
  tertiary-container: '#825100'
  on-tertiary-container: '#ffcb8f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a1f1e5'
  primary-fixed-dim: '#85d5c9'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#06006c'
  on-secondary-fixed-variant: '#2e2ebe'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#fcba66'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#031428'
  on-background: '#d3e3ff'
  surface-variant: '#26364b'
  mesh-teal-start: '#008378'
  mesh-teal-end: '#004d47'
  mesh-amber-start: '#a36700'
  mesh-amber-end: '#5d3a00'
  glass-surface: rgba(33, 49, 69, 0.6)
  accent-cream: '#FFFFF0'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  currency-display:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-xs-caps:
    fontFamily: Hanken Grotesk
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 1.25rem
  stack-gap-sm: 0.5rem
  stack-gap-md: 1rem
  stack-gap-lg: 1.5rem
  section-margin: 2rem
---

## Brand & Style
Luminous Fintech is a sophisticated, high-energy financial management system designed for the modern trader. The brand personality is **trustworthy yet innovative**, utilizing a deep "Midnight Navy" foundation to convey stability, while puncturing the darkness with vibrant, glowing mesh gradients that signify movement and growth.

The design style is a hybrid of **Glassmorphism** and **Modern Corporate**. It leverages translucent surfaces (`glass-card`) and backdrop blurs to create a sense of depth and hierarchy, while using asymmetric shapes and organic gradients to break away from traditional, rigid banking aesthetics. The emotional response is one of empowered control and technical sophistication.

## Colors
The palette is rooted in a deep dark theme. The primary background (`#0b1c30`) provides a high-contrast canvas for interactive elements. 

- **Primary (Teal):** Used for positive growth, "Sales" actions, and primary status indicators.
- **Secondary (Indigo):** Used for navigation highlights and brand reinforcement.
- **Tertiary (Amber):** Reserved for "Purchases," secondary financial metrics, and "In-Progress" states.
- **Glass Surfaces:** A semi-transparent navy (`rgba(33, 49, 69, 0.6)`) with high-intensity backdrop blur (16px) is used for list items and secondary containers to maintain context with the background.
- **Gradients:** Use radial mesh gradients for summary cards to create a "glowing" focal point.

## Typography
The system uses a dual-font approach. **Manrope** handles all headlines, currency displays, and body text, providing a technical and clean readability. **Hanken Grotesk** is used for utility labels and micro-copy, particularly in all-caps formats with wide tracking to denote metadata and secondary information.

Currency values are treated as "Display" type, requiring extra bold weights to ensure financial totals are the first thing a user sees.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a maximum content width of 1280px (7xl). 

- **Margins:** A consistent side margin of `1.25rem` (20px) is applied globally for mobile and tablet.
- **Vertical Rhythm:** A three-tier spacing system handles component proximity. `0.5rem` for related elements (text/icon pairs), `1rem` for sibling elements in a list, and `1.5rem` for major section transitions.
- **Summary Grid:** Uses a responsive column layout that transitions from 1 column (mobile) to 2 columns (tablet/desktop) to maintain the visual impact of the mesh gradient cards.

## Elevation & Depth
Depth is achieved through **translucency and blurs** rather than traditional drop shadows.

1.  **Level 0 (Base):** Deep navy background (`#0b1c30`).
2.  **Level 1 (Surface):** `glass-card` elements with 16px backdrop blur and a `1px` low-opacity white border (`rgba(255,255,255,0.1)`).
3.  **Level 2 (Active/Floating):** Summary cards use high-saturation gradients and a subtle `shadow-xl` to appear as if they are radiating light onto the surface below.
4.  **Interaction:** Elements should utilize a `98%` or `95%` scale-down transform on press to simulate physical tactility.

## Shapes
The shape language is a mix of standard "Soft Rounded" and "Asymmetric Geometric."

- **Standard Cards:** Use a `1.5rem` (24px) uniform radius for most containers.
- **Feature Cards:** Use an **asymmetric corner radius** (24px 8px 24px 8px) to create a distinct, modern brand signature.
- **Buttons:** Use a consistent `0.75rem` (12px) radius, providing a sturdy, clickable appearance.
- **Status Chips:** Full pill (`9999px`) for secondary status indicators.

## Components

### Buttons
- **Primary Action:** Solid background (Teal or Cream), bold typography, and an icon-in-circle prefix. 
- **Navigation Buttons:** Icon-centric with centered labels below, using a high-contrast background color only for the "Active" state.

### Cards
- **Financial Cards:** Use mesh gradients and asymmetric rounding. They must include a decorative background element (like a blurred circle) to enhance the light-source effect.
- **List Cards:** Utilize the `glass-card` style with a horizontal flex layout and right-aligned numeric data.

### Status Indicators
- Small, caps-lock labels inside a `20%` opacity background of the state color (e.g., Green for Succeeded, Amber for Processing).

### Bottom Navigation
- Fixed position with `80%` opacity and a `backdrop-blur-2xl`. It should use a subtle top-ring border to separate it from the main content.