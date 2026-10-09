# 3D Point-Cloud Undulating Bioluminescent Orb

A high-performance, non-blocking 3D Point-Cloud Orb created with Three.js, WebGL, custom GLSL Simplex Noise shaders, and Web Workers with `OffscreenCanvas`.

## Features
- **Non-Blocking Architecture**: Entire WebGL scene, geometry generation, camera, and `requestAnimationFrame` loop run exclusively in a Web Worker via `OffscreenCanvas`. The main thread only handles DOM events and mouse interactions.
- **GPU Wave Displacement**: Organic topographical undulating ripples computed entirely on the GPU via custom GLSL 3D Simplex noise.
- **Bioluminescent Shading**: Neon magenta to cyan gradient based on point position with bright white Fresnel edge rim highlights and additive blending.
- **Memory Optimized**: 14,000 points uniformly distributed on a Fibonacci sphere stored in `THREE.BufferGeometry`.

## How to Run Locally

Because Web Workers and ES modules require a local HTTP server (browsers block Web Workers on `file://` protocol due to CORS security policies):

### Option 1: Using npx serve (Zero install required)
```bash
# Navigate to the orb-standalone directory
cd public/orb-standalone

# Run a local HTTP server
npx serve .
```
Then open `http://localhost:3000` (or the port shown in your terminal).

### Option 2: Using Python 3
```bash
cd public/orb-standalone
python3 -m http.server 8080
```
Then open `http://localhost:8080` in Chrome, Firefox, Edge, or Safari 17+.

### Option 3: Using Node / Vite / Live Server
Any static server or VS Code "Live Server" extension will run the files out-of-the-box.
