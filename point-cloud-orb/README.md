# Futuristic Undulating 3D Point-Cloud Orb

An optimized, bioluminescent 3D point-cloud sphere built with **Three.js**, **GLSL Shaders**, and **Web Workers via OffscreenCanvas**.

---

## Architecture & Technical Highlights

1. **True Non-Blocking OffscreenCanvas Execution**:
   - The main thread creates the `<canvas>` element and immediately transfers control using `canvas.transferControlToOffscreen()`.
   - The entire Three.js `WebGLRenderer`, `Scene`, `PerspectiveCamera`, and `requestAnimationFrame` loop run inside `worker.js`.
   - The main UI thread stays at a locked 60 FPS with zero frame drops during heavy computations or DOM updates.

2. **GPU Vertex Shader Simplex Noise Displacement**:
   - 16,384 vertices distributed with optimal uniformity across a Fibonacci sphere.
   - 100% of organic wave displacement calculations are performed on the GPU using a multi-octave 3D Simplex noise implementation.
   - Point sizes are dynamically scaled via perspective depth attenuation (`gl_PointSize = size * (280.0 / -mvPosition.z)`).

3. **Custom Fragment Shader Bioluminescence**:
   - Multi-stop color gradient: Neon Magenta (`#ff0a94`) on the left to Electric Cyan (`#00e5ff`) on the right.
   - Fresnel view-angle edge detection computes bright white outer rim highlights.
   - Radial soft particle shape discards outer quad corners for circular glow spots.
   - `THREE.AdditiveBlending` creates an intense bioluminescent core.

---

## How to Run Locally

Because Web Workers and ES modules require a secure origin (local HTTP server), opening `index.html` via `file://` will trigger browser CORS/worker restrictions.

### Option 1: Using Python (Zero Install)
```bash
# Navigate to the folder
cd public/point-cloud-orb

# Python 3
python -m http.server 8080

# Then open in your browser:
# http://localhost:8080
```

### Option 2: Using Node / npx (Zero Install)
```bash
# Using serve
npx serve public/point-cloud-orb

# Or using http-server
npx http-server public/point-cloud-orb -p 8080
```

### Option 3: Using Vite (Already included in this project)
When running `npm run dev` in this repository, access:
`http://localhost:3000/point-cloud-orb/index.html`

---

## File Structure

```
point-cloud-orb/
├── index.html           # Main HTML with deep navy void background & HUD
├── main.js              # Main thread: Worker spawn, OffscreenCanvas transfer, events
├── worker.js            # Worker thread: Three.js setup, render loop, geometry
├── shaders/
│   ├── vertex.glsl      # 3D Simplex noise displacement vertex shader
│   └── fragment.glsl    # Magenta-to-cyan gradient & Fresnel fragment shader
└── README.md            # Documentation & local running guide
```
