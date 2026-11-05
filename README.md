# Rich Media Ad Formats - Recruitment Task

This repository contains the implementation of the recruitment assignment for the Frontend / Rich Media Developer position, featuring **Variant B: Fireplace Ad**.

---

## How to Run Locally

You can preview the ad unit using any local static file server:

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in VS Code.
2. Right-click on `variant-b-fireplace/preview.html`.
3. Select **"Open with Live Server"**.

### Option 2: Node.js `npx serve` / `http-server`
Run in your terminal:
npx serve .

and navigate to: `http://localhost:3000/variant-b-fireplace/preview.html`.

---

## Variant B: Fireplace Ad Overview

- **Architecture:** 3 independent creatives delivered in production as standalone units:
  - `top.html` (1032x250 CSS px)
  - `left.html` (320x975 CSS px)
  - `right.html` (320x975 CSS px)
- **Orchestration:** `preview.html` embeds all three ads via `iframe` elements and orchestrates animation synchronization using the `window.postMessage` API.
- **Animations:** Powered by GSAP 3 (strictly using GPU-accelerated `transform` and `opacity` properties).
- **Reduced Motion:** Fully compliant with `prefers-reduced-motion: reduce` (renders static final state instantly without running transitions).
- **Looping Policy:** Continuous ambient motion (subtle background drift & CTA pulse) automatically halts before the 30-second mark.
- **Clickout:** Global click handler bound to standard `window.clickTag`.

---

## What I Would Do Next (With More Time)

1. **Pixel-Perfect Debug Overlay Toggle:** Add a keyboard shortcut or button in `preview.html` to toggle `design/layout.png` at 50% opacity directly over the live iframes for instant QA validation.
2. **Asset Optimization & Modern Formats:** Convert JPG/PNG assets to WebP/AVIF with fallback picture tags to optimize payload size further.
3. **Dynamic Responsive Scaling:** Implement an automatic CSS `scale()` wrapper so the fireplace scales proportionally on lower laptop resolutions (< 1680px viewport width).

---

## Known Issues / Shortcuts Taken

- **Isolated iframe Blending:** Because browsers enforce independent rendering contexts for cross-document iframes, CSS `mix-blend-mode` cannot sample pixels from parent/adjacent iframes. The text panels were therefore matched with native CSS gradient/container styling rather than relying on raw unmasked black-backdrop raster exports.

---

## AI Usage Note

- **Tools Used:** Gemini (collaborative code review, CSS layout debugging, and GSAP timeline pacing).
- **Example of Correction:** When importing the raw asset `hl.png` for the left skyscraper, the graphic contained a solid black rectangular background instead of an alpha channel. The initial attempt to composite it via global CSS filters caused black visual artifacts that obscured the underlying background and product shot. I diagnosed the canvas context issue, bypassed the faulty black alpha layer, and replaced it with a cleanly styled CSS text card matched 1:1 to `design/layout.png`.