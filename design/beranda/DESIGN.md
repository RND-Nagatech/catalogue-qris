---
name: Vibrant Utility
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d4a3f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6d7a6e'
  outline-variant: '#bccabc'
  surface-tint: '#006d39'
  primary: '#006a37'
  on-primary: '#ffffff'
  primary-container: '#008648'
  on-primary-container: '#f6fff4'
  inverse-primary: '#5bdf8c'
  secondary: '#865300'
  on-secondary: '#ffffff'
  secondary-container: '#fea520'
  on-secondary-container: '#694000'
  tertiary: '#4c5e71'
  on-tertiary: '#ffffff'
  tertiary-container: '#64768a'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#79fca5'
  primary-fixed-dim: '#5bdf8c'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#00522a'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#ffb961'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#d1e4fb'
  tertiary-fixed-dim: '#b5c8df'
  on-tertiary-fixed: '#091d2e'
  on-tertiary-fixed-variant: '#36485b'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1200px
  gutter: 16px
---

## Brand & Style
The design system focuses on high-utility dashboard experiences that balance professional reliability with energetic visuals. It targets users in finance, logistics, or retail management who require clarity at a glance but appreciate a friendly, modern interface. 

The aesthetic is **Modern Minimalist with Tonal Vibrancy**. It utilizes heavy whitespace and clean lines to organize complex data, while injecting personality through saturated primary colors and soft, organic shapes. The goal is to evoke a sense of efficiency, optimism, and approachability.

## Colors
The palette is driven by a high-energy **Vibrant Green** (#00a65a) for primary actions and positive growth indicators, complemented by a **Warm Orange** (#f39c12) for secondary focus areas or cautionary highlights. 

- **Primary:** Used for main call-to-actions, success states, and primary dashboard cards.
- **Secondary:** Used for differentiation in data visualization and secondary card backgrounds.
- **Surface & Backgrounds:** The system uses a very light neutral gray (#f8f9fa) for page backgrounds to allow white cards to pop, ensuring a crisp, layered look.
- **Typography:** Deep slate (#2c3e50) is used for headings to maintain readability without the harshness of pure black.

## Typography
**Hanken Grotesk** is the sole typeface for this design system, chosen for its sharp, contemporary geometry and exceptional legibility in data-dense environments.

- **Headlines:** Use tighter letter spacing and heavier weights (600-700) to create a strong visual anchor.
- **Caps Labels:** Small, uppercase labels with increased tracking (letter spacing) are used for "overlines" and secondary metadata to create hierarchy without increasing font size.
- **Scale:** On mobile, display sizes are reduced significantly to prioritize content density while maintaining the bold typographic character.

## Layout & Spacing
The design system utilizes a **4px base unit** to ensure consistent rhythmic scaling across all elements. 

- **Grid Model:** A 12-column fluid grid is used for desktop, transitioning to a 1-column layout for mobile. 
- **Margins:** Mobile views use a fixed 16px side margin, while desktop views center content within a 1200px max-width container.
- **Visual Grouping:** Cards and modules are separated by 24px (lg) on desktop and 16px (md) on mobile to maintain a sense of airiness and clarity.

## Elevation & Depth
Depth is achieved through **Soft Ambient Shadows** rather than harsh outlines. This creates a "lifted" effect for interactive elements against the light neutral background.

- **Level 1 (Default Cards):** A subtle shadow with a large blur radius (e.g., `0px 4px 20px rgba(0,0,0,0.05)`) identifies primary content containers.
- **Level 2 (Interactive/Active):** Higher elevation (e.g., `0px 8px 30px rgba(0,0,0,0.08)`) is used for hovered states or modal windows.
- **Tonal Tiers:** Flat background fills in primary and secondary colors are used to differentiate key summary blocks (Total Sales, Total Purchases), removing the need for shadows on high-chroma elements.

## Shapes
The shape language is defined by **pronounced 16px corners** (rounded-lg), which soften the high-contrast color palette and make the interface feel modern and friendly.

- **Primary Containers:** 16px (1rem) for cards and major dashboard modules.
- **Small Elements:** 8px (0.5rem) for input fields, buttons, and chips to maintain a cohesive but tighter appearance.
- **Icons:** Set within circular or highly rounded containers (8px) to echo the overall softness of the system.

## Components
- **Buttons:** Large, 48px height primary buttons use solid #00a65a with white text. Secondary buttons use ghost styles with a 1px border. All buttons carry the 8px corner radius.
- **Cards:** White backgrounds with 16px rounded corners and Level 1 shadows. Header summary cards use full-bleed primary or secondary color fills with white typography.
- **Input Fields:** Clean, white fills with a light 1px border (#dee2e6). On focus, the border transitions to Primary Green with a soft glow.
- **Status Chips:** Small, capsules with subtle background tints and bold text (e.g., light green background with dark green text for "Selesai").
- **Bottom Navigation:** Fixed navigation for mobile with clear, line-art icons and active states highlighted in Primary Green.
- **Lists:** Transaction items should use a clean, borderless row style with a subtle 1px divider between items, ensuring the focus remains on the typography and status labels.