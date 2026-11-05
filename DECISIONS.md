# Architectural & Engineering Decisions

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