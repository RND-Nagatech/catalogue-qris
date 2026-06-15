---
name: Emerald POS System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3f4944'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f7973'
  outline-variant: '#bec9c2'
  surface-tint: '#1b6b51'
  primary: '#004532'
  on-primary: '#ffffff'
  primary-container: '#065f46'
  on-primary-container: '#8bd6b7'
  inverse-primary: '#8bd6b6'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#2d3d52'
  on-tertiary: '#ffffff'
  tertiary-container: '#44546a'
  on-tertiary-container: '#b8c8e2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f2d1'
  primary-fixed-dim: '#8bd6b6'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 1rem
  gutter-md: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
  container-padding: 1.25rem
---

## Brand & Style

This design system is built for the high-stakes environment of retail sales and point-of-sale operations. The brand personality is **Modern Professional**: it is efficient, dependable, and sophisticated. It moves away from the "toy-like" saturation of consumer apps toward a refined, productivity-focused aesthetic that reduces cognitive load during long shifts.

The design style is a blend of **Minimalism** and **Modern Corporate**. It prioritizes high-contrast legibility and functional whitespace. By utilizing a "Quiet UI" approach—where secondary information recedes through soft grays—the interface ensures that the most critical sales data remains the focal point. The aesthetic evokes a sense of calm authority, ensuring the user feels in control of the transaction at all times.

## Colors

The palette is centered around a **Muted Emerald**, a sophisticated evolution of the source material that provides professional gravity without visual fatigue.

- **Primary (Emerald):** Used for primary actions, success states, and brand presence.
- **Secondary (Amber):** Reserved for cautionary elements, pending states, or specific "Add Customer" highlights to provide a warm counter-balance to the cool green.
- **Surface & Backgrounds:** We use a hierarchy of soft grays (`#F8FAFC` for base, `#F1F5F9` for containers) to create a clean, layered look that avoids the harshness of pure white.
- **Typography Colors:** Primary text is set in a deep slate (`#0F172A`) for maximum readability, while labels use a medium gray (`#64748B`) to create a clear visual hierarchy.

## Typography

We employ **Manrope** for its exceptional legibility and balanced geometric qualities. It bridges the gap between technical precision and human friendliness.

- **Scale:** The system uses a tight typographic scale to ensure information density remains high but readable.
- **Weight:** Headlines use SemiBold (600) and Bold (700) to anchor the page. Body text stays at Medium (500) for better stroke definition on mobile screens.
- **Contrast:** Large currency values or "Total" figures should utilize the Bold weight to ensure they are the first thing a user sees on a checkout screen.
- **Letter Spacing:** Small labels use a slight tracking increase (+5%) to maintain clarity at 12px.

## Layout & Spacing

The layout follows a **Fluid Grid** logic optimized for the 1-column mobile experience.

- **Rhythm:** An 8px linear scale (0.5rem) governs all spatial relationships.
- **Margins:** A consistent 16px (1rem) safe-area margin is maintained on the left and right of the viewport.
- **Touch Targets:** All interactive elements maintain a minimum height of 48px to ensure accessibility for fast-paced POS environments.
- **Density:** We use "Tonal Grouping" to separate sections—placing related fields inside a light-gray container with 20px internal padding to reduce the perceived complexity of long forms.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** instead of heavy shadows to maintain a "flat-plus" professional aesthetic.

- **Z-0 (Base):** The application background (`#F8FAFC`).
- **Z-1 (Cards/Sections):** White surfaces with a subtle 1px border (`#E2E8F0`) to define boundaries without adding visual weight.
- **Z-2 (Active State/Modals):** Use a very soft, diffused shadow (0px 4px 12px, 5% opacity black) only for floating elements like bottom sheets or modals.
- **Interaction:** When a user taps a card or button, the depth is communicated via a subtle shift in background color rather than a physical "lift" effect.

## Shapes

The shape language is **Rounded (0.5rem)**, providing a modern and approachable feel that avoids the clinical harshness of sharp corners.

- **Standard Elements:** Buttons, input fields, and small cards use the base 8px (0.5rem) radius.
- **Large Containers:** Transaction summaries or main dashboard cards use the `rounded-lg` (1rem) radius to create a softer visual "nesting" for inner elements.
- **Specialized Icons:** Icon backgrounds (e.g., the scan icon or user avatar) use a circular clip to provide a distinct visual anchor.

## Components

### Buttons
- **Primary:** Solid Emerald (`#065F46`) with white text. High-contrast, no shadow.
- **Secondary:** Ghost style with an Emerald border and text. Used for "Add Member" or "Filter" actions.
- **Destructive:** Subtle red text with no background, reserved for "Cancel Transaction."

### Input Fields
- **Default State:** White background, 1px slate-200 border, 8px corner radius.
- **Active/Focus State:** 2px Emerald border.
- **Labels:** Always placed above the field in `label-sm` slate-500 typography. Never use floating labels to maintain consistent vertical scan lines.

### Cards & Lists
- **Item Cards:** Use a white background with a thin gray stroke. Items in the cart should have a clean vertical separator and a clear "quantity" badge in the primary color.
- **Lists:** Use 16px vertical padding between list items to prevent accidental taps.

### Feedback
- **Chips:** Small, pill-shaped indicators for statuses like "Non-Member" or "Paid." Use low-saturation backgrounds (e.g., light green background with dark green text) for a sophisticated look.
- **Success States:** Full-screen overlays are avoided; instead, use a top-anchored toast notification in the Emerald brand color.