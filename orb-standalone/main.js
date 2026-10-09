/**
 * Main Thread Controller (main.js)
 * Initializes Web Worker and transfers OffscreenCanvas for 60fps non-blocking rendering.
 */

const container = document.getElementById('orb-container');
const canvas = document.getElementById('orb-canvas');

const width = container.clientWidth || 360;
const height = container.clientHeight || 360;
const pixelRatio = window.devicePixelRatio || 1;

canvas.width = width;
canvas.height = height;

// Transfer canvas control to Web Worker
if ('transferControlToOffscreen' in canvas) {
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

  worker.postMessage(
    {
      type: 'init',
      canvas: offscreen,
      width,
      height,
      pixelRatio,
    },
    [offscreen]
  );

  worker.onmessage = (e) => {
    if (e.data?.type === 'ready') {
      const statusEl = document.getElementById('status-indicator');
      if (statusEl) statusEl.textContent = 'Rendering on Web Worker (OffscreenCanvas)';
    }
  };

  // Interactive mouse tilt
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    worker.postMessage({ type: 'mousemove', x, y });
  });

  container.addEventListener('mouseleave', () => {
    worker.postMessage({ type: 'mousemove', x: 0, y: 0 });
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth || 360;
    const newHeight = container.clientHeight || 360;
    worker.postMessage({
      type: 'resize',
      width: newWidth,
      height: newHeight,
      pixelRatio: window.devicePixelRatio || 1,
    });
  });
} else {
  alert('Your browser does not support OffscreenCanvas. Please use Chrome, Edge, Firefox, or Safari 17+');
}
