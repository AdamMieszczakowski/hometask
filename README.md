# Rich Media Ad Formats - Recruitment Task

This repository contains the complete implementation of the recruitment assignment for the Frontend / Rich Media Developer position, featuring both **Variant A: Gut Run (Mobile Game Ad)** and **Variant B: Fireplace Ad (Desktop Skin)**.

---

## How to Run Locally

Because both projects utilize external audio and dynamic graphic assets, opening files directly via the file:// protocol may trigger browser CORS restrictions. Please preview the ad units using any local static file server:

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in VS Code.
2. For **Variant A**: Right-click on `variant-a-game/index.html` and select **"Open with Live Server"**.
3. For **Variant B**: Right-click on `variant-b-fireplace/preview.html` and select **"Open with Live Server"**.

### Option 2: Node.js npx serve / http-server
Run in your terminal:
npx serve .

- Variant A: http://localhost:3000/variant-a-game/index.html
- Variant B: http://localhost:3000/variant-b-fireplace/preview.html

---

## Variant A: Game Ad ("Gut Run") Overview

A mobile fullscreen mini-game developed for a gut health campaign, built on vanilla HTML5 <canvas> and GSAP.

- **Architecture & Viewport:** Standard portrait mobile ad designed at 360x640 CSS px (assets @2x). Responsive container scaling handles viewports from 320x568 up to 430x932 without distortion or UI clipping.
- **Canvas Physics & Mechanics:** Flappy-Bird-style tap-to-jump physics (impulse velocity, constant gravity, clamped terminal velocities). The player stays horizontally fixed while the gut corridor scrolls infinitely.
- **Seamless Mirrored Tiling (Ping-Pong):** The source gut texture (`gameplay.png`) is asymmetrical at its outer bounds. To eliminate vertical seams and visual fractures, the engine dynamically renders every alternate column in a flipped horizontal axis (`scale(-1, 1)`) with a 2px subpixel crop, producing a 100% seamless infinite intestine loop.
- **Fair Collision Detection:** Rectangular bounding-box hitboxes are reduced by ~20% inner margins and mapped to the circular player hitbox to eliminate unfair collisions with empty transparent pixels.
- **Progression & Obstacles:** Synchronized rendering of all 15 required obstacles (6 bacteria: `bac1`–`bac6` and 9 text barriers: `txt1`–`txt9`), each appearing exactly once per run.
- **Audio Lifecycle & Autoplay:** Background music loop and sound effects (crash, applause, cheer) strictly unlock upon the first user interaction, complying with browser autoplay restrictions. Includes an interactive mute toggle button.
- **Tab Visibility & Accessibility:** Game loop and audio automatically pause and resume via `document.visibilitychange`. Supports `prefers-reduced-motion: reduce` by disabling aggressive rotations and elastic screen shakes.
- **Debug Mode:** Launch with `?debug=1` in the URL to visualize player radii, obstacle hitboxes, and boundary thresholds in real time.
- **Clickout:** Global click handler bound to `const clickTag = window.clickTag || '[https://example.com/landing](https://example.com/landing)';`.

---

## Variant B: Fireplace Ad Overview

- **Architecture:** 3 independent creatives delivered in production as standalone units:
  - `top.html` (1032x250 CSS px)
  - `left.html` (320x975 CSS px)
  - `right.html` (320x975 CSS px)
- **Orchestration:** `preview.html` embeds all three ads via iframe elements and orchestrates animation synchronization using the `window.postMessage` API.
- **Animations:** Powered by GSAP 3 (strictly using GPU-accelerated `transform` and `opacity` properties).
- **Reduced Motion:** Fully compliant with `prefers-reduced-motion: reduce` (renders static final state instantly without running transitions).
- **Looping Policy:** Continuous ambient motion (subtle background drift & CTA pulse) automatically halts before the 30-second mark.
- **Clickout:** Global click handler bound to standard `window.clickTag`.

---

## Asset Optimization & Payload (< 3 MB)

To comply with the strict < 3 MB production delivery budget:
- Excluded heavy raw mockup folders (`design/`) from the final deployable units.
- Compressed all high-DPI @2x assets losslessly via TinyPNG / Squoosh, stripping metadata while preserving transparency and pixel clarity.
- Downsampled audio tracks to 96 kbps joint-stereo MP3, slashing sound asset weight by ~65% with zero perceptible quality degradation on mobile speakers.

---

## What I Would Do Next (With More Time)

1. **Pixel-Perfect Debug Overlay Toggle:** Add a keyboard shortcut or button in `preview.html` and `index.html` to toggle design mockups at 50% opacity directly over the live ad for instant QA validation.
2. **Modern Format Delivery:** Convert PNG/JPG assets to WebP/AVIF with fallback picture tags to optimize the delivery payload even further.
3. **Adaptive Difficulty:** Implement an optional progressive speed curve in Variant A as the player clears later obstacles.
4. **Dynamic Responsive Scaling (Variant B):** Implement an automatic CSS `scale()` wrapper so the fireplace scales proportionally on lower laptop resolutions (< 1680px viewport width).

---

## Known Issues / Shortcuts Taken

- **Isolated iframe Blending (Variant B):** Because browsers enforce independent rendering contexts for cross-document iframes, CSS `mix-blend-mode` cannot sample pixels from parent/adjacent iframes. The text panels were therefore matched with native CSS gradient/container styling rather than relying on raw unmasked black-backdrop raster exports.

---

## AI Usage Note

- **Tools Used:** Claude Code & Gemini (collaborative code review, CSS layout debugging, math for canvas tiling, and GSAP timeline pacing).
- **Examples of Correction:**
  - **Variant B (Left Skyscraper Headline):** When importing the raw asset `hl.png` for the left skyscraper, the graphic contained a solid black rectangular background instead of an alpha channel. The initial attempt to composite it via global CSS filters caused black visual artifacts that obscured the underlying background and product shot. I diagnosed the canvas context issue, bypassed the faulty black alpha layer, and replaced it with a cleanly styled CSS text card matched 1:1 to `design/layout.png`.
  - **Variant A (Infinite Gut Seam & Hitbox Clipping):** The AI initially attempted a simple modulo wrap-around loop for `gameplay.png`, which split the intestine columns vertically and caused visible cracking. I identified the asymmetry between the left and right loop curves, corrected it by implementing a mirrored *Ping-Pong Tiling* projection with subpixel edge-cropping, and manually re-calibrated obstacle offsets to fit naturally within the playable wave.