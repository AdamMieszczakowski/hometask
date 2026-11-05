# Architectural & Engineering Decisions

This document outlines key technical decisions, architectural trade-offs, and engineering rationale implemented across both rich media deliverables (**Variant A: Gut Run Mini-Game** and **Variant B: Fireplace Desktop Skin**).

---

## Variant A: Mobile Game Ad ("Gut Run")

### 1. Canvas 2D Context vs DOM-based Game Entities
- **Decision:** Implemented game logic, continuous environment rendering, and dynamic entities entirely on an HTML5 `<canvas>` context, keeping only top-level overlays (Start/Endcards, Logo bar, Mute toggle) in semantic DOM.
- **Reasoning:** In rich media mobile ad environments, animating dozens of DOM elements simultaneously (scrolling backgrounds, moving obstacles, rotating character) causes layout thrashing, DOM re-flow overhead, and dropped frames. A single 2D Canvas context running a fixed `requestAnimationFrame` delta-time loop ensures guaranteed 60 FPS rendering and minimal memory allocation across low-end mobile devices.

### 2. Seamless Infinite Loop: Ping-Pong Mirrored Tiling vs Direct Modulo Wrapping
- **Decision:** Developed an alternating mirrored projection (`scale(-1, 1)`) with a 2px subpixel crop for consecutive horizontal sections of `gameplay.png`.
- **Reasoning:** The provided gut asset (`gameplay.png`) has an asymmetric curved topology at its outer left and right edges. Standard linear repeat (`x % width`) creates obvious vertical seam fractures where column edges do not align. Mirrored tiling ensures that entering and exiting loops meet at identical coordinate tangents, producing a truly seamless, unbroken intestinal wave indefinitely.

### 3. Hitbox Refinement & Fair Collision Geometry
- **Decision:** Bypassed raw rectangular sprite bounding boxes in favor of calibrated collision boundaries: a radial inner circle ($r = 17\text{ px}$) for the player and an inner proportional inset (~15–25%) for text and bacterial obstacles.
- **Reasoning:** Sprite asset files include substantial transparent safety padding. Checking collisions against full rectangular image bounds produces unfair "invisible hits," frustrating players. Inset circular-to-box projection ensures collision fires only when the visual body of the character visibly intersects the core visual mass of an obstacle.

### 4. Audio Lifecycle & Autoplay Restriction Handling
- **Decision:** Audio initialization and background playback are deferred strictly until the first user tap, alongside state-aware `document.visibilitychange` handling.
- **Reasoning:** Modern mobile browsers (iOS Safari, Chrome Mobile) strictly reject unmuted programmatic audio playback (`NotAllowedError`). Initializing on first pointer interaction ensures compliance with autoplay policies, while tab visibility events immediately pause active streams to conserve device battery and avoid background noise.

---

## Variant B: Fireplace Ad (Desktop Skin)

### 1. Continuous Background Strategy: Pre-cut Assets vs Continuous Canvas
- **Decision:** Used the dedicated pre-cut background assets (`assets/left/bg.jpg`, `assets/top/bg.jpg`, `assets/right/bg.jpg`) instead of slicing `bg-big.jpg` dynamically in CSS.
- **Reasoning:** In production ad tech (Google Ad Manager, AppNexus, Adform), the three creatives (`top`, `left`, `right`) are served as completely separate line items and may load from different CDN subdomains or asynchronously. Relying on pre-cut assets ensures that each creative is self-contained, keeps initial payload within strict IAB size limits, and avoids high-resolution canvas slicing overhead.

### 2. DOM Animation with GSAP vs HTML5 Canvas
- **Decision:** Used standard semantic DOM elements animated with GSAP 3.
- **Reasoning:** The unit relies primarily on high-resolution photography, text, and vector-style buttons. DOM elements with `transform` and `opacity` allow the browser to offload rendering to the compositor thread (GPU layer promotion via `will-change`), ensuring 60 FPS performance without the memory footprint of three large concurrent `<canvas>` contexts.

### 3. Inter-creative Synchronization via `postMessage`
- **Decision:** Implemented a lightweight messaging bridge where `preview.html` sends a `START_ANIMATION` event to all three iframes once all resources are loaded.
- **Reasoning:** Since `iframe` load times can vary slightly depending on network latency, this guarantees that the intro zoom, headline stagger, and CTA entrance start in perfect lockstep across the entire screen. Each creative also has a fallback check (`window.self === window.top`) to play automatically if opened standalone.

### 4. Accessibility & Performance Guardrails
- **`prefers-reduced-motion`:** Detected through `window.matchMedia`. When active, animations are bypassed and all elements are immediately rendered in their resolved final state.
- **30s Loop Cap:** Ambient animations (subtle zoom on the background and a gentle CTA breathing effect) are bound to a timeline that stops after 9 cycles (~28s), respecting publisher battery and distraction policies.