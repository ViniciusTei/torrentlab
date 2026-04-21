# Design System Document

## 1. Overview & Creative North Star
**Creative North Star: The Cinematic Archive**
This design system moves away from the cluttered, ad-heavy aesthetic typical of torrent platforms and moves toward a "High-End Editorial" experience. It treats digital files like curated artifacts in a premium gallery. 

The visual language is defined by **Atmospheric Precision**: a calm, tech-focused atmosphere achieved through expansive negative space, layered surfaces, and a rejection of traditional structural lines. By utilizing intentional asymmetry—such as offset movie posters and oversized editorial typography—we create a layout that feels bespoke and intentional, rather than a generic database.

## 2. Colors
The palette is rooted in a sophisticated range of cool slates and deep teals, designed to feel "tech-professional" without the aggression of pure black or the sterile nature of pure white.

### The Palette (Material Convention)
*   **Primary (`#3e56aa`)**: Used for high-priority actions and brand presence.
*   **Surface (`#f7f9fe`)**: The base of the canvas.
*   **Surface Container Tiers**: 
    *   `surface_container_lowest`: `#ffffff` (Floating elements)
    *   `surface_container_low`: `#f2f4f9` (Subtle depth)
    *   `surface_container_highest`: `#e0e2e7` (Emphasis/Hover states)

### The "No-Line" Rule
To achieve a premium, seamless feel, **prohibit the use of 1px solid borders for sectioning.** Boundaries must be defined through tonal shifts. A movie information card should not have a stroke; instead, place a `surface_container_lowest` card atop a `surface_container_low` section. The change in luminance is enough to signify a new container.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
*   **Level 0 (Background):** `surface`
*   **Level 1 (Sections):** `surface_container_low`
*   **Level 2 (Cards/Interactives):** `surface_container_lowest`

### The "Glass & Gradient" Rule
For floating navigation or movie "Quick View" modals, use **Glassmorphism**. Apply `surface_container_lowest` at 70% opacity with a `20px` backdrop-blur. For primary CTAs, use a subtle linear gradient from `primary` (`#3e56aa`) to `primary_container` (`#5870c5`) at a 135-degree angle to add "soul" and dimension.

## 3. Typography
The system uses a pairing of **Manrope** for structural hierarchy and **Inter** for high-utility reading.

*   **Display (Manrope)**: Set `display-lg` (3.5rem) with a `-0.02em` letter-spacing. Use this for movie titles on hero pages to create an authoritative, editorial feel.
*   **Headlines (Manrope)**: Medium weight. These should guide the user through movie categories (e.g., "Trending Subtitles").
*   **Body (Inter)**: Standardized at `body-md` (0.875rem) for metadata (seeders, size, upload date). The neutral nature of Inter ensures that technical data doesn't distract from the cinematic imagery.
*   **Labels (Inter)**: Use `label-md` (0.75rem) in **All Caps** with `0.05em` letter-spacing for movie genres or file formats. This creates a "tag" feel without requiring heavy containers.

## 4. Elevation & Depth
Depth is achieved through "Tonal Layering" rather than structural shadows.

*   **The Layering Principle**: If a movie poster needs to "pop," do not add a shadow. Instead, lift the container’s color from `surface` to `surface_container_lowest`. 
*   **Ambient Shadows**: Use only for floating "Popovers" or "Modals." Use a 4-layer diffused shadow: `0px 10px 30px rgba(62, 86, 170, 0.08)`. The tint should always match the `on-surface` color to feel like natural ambient light.
*   **The "Ghost Border" Fallback**: If a border is required for accessibility (e.g., in a high-contrast mode or input field), use `outline_variant` at **15% opacity**. It should be felt, not seen.

## 5. Components

### Buttons
*   **Primary**: Gradient-filled (`primary` to `primary_container`), `radius-md` (0.75rem). No border. White text.
*   **Secondary**: `surface_container_highest` background with `primary` text. This is for "Add to Watchlist" or "View Trailer."
*   **Tertiary**: Pure text with an underline that appears only on hover.

### Cards & Lists
*   **Movie Cards**: Use `radius-lg` (1rem) for posters. Forbid dividers between list items. Instead, use `1.5rem` of vertical whitespace. Metadata (Size, Quality) should be styled as `label-sm` in `on_surface_variant`.
*   **Subtitle Rows**: Use alternating background shifts (`surface` to `surface_container_low`) to distinguish rows. 

### Input Fields (Search)
*   The search bar should be a "Floating Glass" element. 
*   **Style**: `surface_container_lowest` at 80% opacity, `backdrop-blur: 12px`, `radius-full`, and a `15% opacity` ghost border. This makes the search feel like a high-tech tool floating over the cinematic content.

### Chips
*   **Filter Chips**: Use `surface_container_high`. When selected, transition to `primary` with `on_primary` text. Use `radius-full` for a soft, tech-focused aesthetic.

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical grid layouts. For example, a large movie poster on the left with text content offset to the right.
*   **Do** use large amounts of whitespace (padding: `2rem`+) between major sections to maintain a "calm" feel.
*   **Do** utilize high-quality movie stills as background elements behind glass containers.

### Don't
*   **Don't** use 100% black text. Always use `on_surface` (`#181c20`) for better visual comfort.
*   **Don't** use sharp 0px corners. This design system relies on the "Soft Tech" feel of `radius-md` and `radius-lg`.
*   **Don't** use horizontal rules (`<hr>`). Separate content using the Spacing Scale or subtle background color changes.
*   **Don't** use standard blue for links. Use the `primary` token to ensure brand alignment.