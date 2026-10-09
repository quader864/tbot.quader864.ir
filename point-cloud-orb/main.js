/**
 * main.js
 * Main UI thread script.
 * Sole responsibility: Spawns Web Worker, transfers OffscreenCanvas, handles DOM & input events.
 * Heavy WebGL scene & shader computations run completely non-blocking on the worker!
 */

const canvas = document.getElementById('webgl-canvas');
const statusBadge = document.getElementById('status-badge');
const fpsCounter = document.getElementById('fps-counter');

// 1. Verify OffscreenCanvas support
if (!canvas.transferControlToOffscreen) {
  statusBadge.textContent = 'OffscreenCanvas unsupported in this browser';
  statusBadge.className = 'error';
  throw new Error('OffscreenCanvas not supported in this browser.');
}

// 2. Transfer control to OffscreenCanvas
const offscreen = canvas.transferControlToOffscreen();

// 3. Spawn the Web Worker
const worker = new Worker('worker.js', { type: 'module' });

// 4. Send initial canvas and dimensions to worker
const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

worker.postMessage(
  {
    type: 'init',
    canvas: offscreen,
    width,
    height,
    pixelRatio,
  },
  [offscreen] // Transferable object ownership transferred to worker
);

statusBadge.textContent = 'Worker Active (OffscreenCanvas)';

// 5. Forward Window Resize Events to Worker
window.addEventListener('resize', () => {
  worker.postMessage({
    type: 'resize',
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  });
});

// 6. Forward Mouse Parallax Tilt to Worker
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;
  worker.postMessage({
    type: 'mousemove',
    x,
    y,
  });
});

// 7. Interactive UI Controls on Main Thread
const speedSlider = document.getElementById('speed-slider');
if (speedSlider) {
  speedSlider.addEventListener('input', (e) => {
    worker.postMessage({
      type: 'setSpeed',
      speed: parseFloat(e.target.value),
    });
  });
}

// 8. Main Thread FPS Meter (Proves main thread stays silky smooth at 60fps)
let frameCount = 0;
let lastFpsUpdate = performance.now();

function measureMainThreadFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    if (fpsCounter) {
      fpsCounter.textContent = `${fps} FPS`;
    }
    frameCount = 0;
    lastFpsUpdate = now;
  }
  requestAnimationFrame(measureMainThreadFps);
}
requestAnimationFrame(measureMainThreadFps);
