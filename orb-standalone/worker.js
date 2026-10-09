/**
 * Standalone Web Worker for 3D Point-Cloud Orb Rendering
 * Runs Three.js rendering loop on an OffscreenCanvas off the main thread.
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { vertexShader, fragmentShader } from './shaders.js';

let renderer = null;
let scene = null;
let camera = null;
let pointCloud = null;
let material = null;

let isRunning = false;
let lastTime = 0;
let totalTime = 0;
let currentSpeed = 0.8;

// Mouse tilt tracking
let targetRotX = 0;
let targetRotY = 0;

function createFibonacciSphereGeometry(numPoints = 2400, radius = 0.96) {
  const positions = new Float32Array(numPoints * 3);
  const normals = new Float32Array(numPoints * 3);
  const phi = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < numPoints; i++) {
    const theta = (2 * Math.PI * i) / phi;
    const y = 1 - (i / (numPoints - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;

    normals[i * 3] = x;
    normals[i * 3 + 1] = y;
    normals[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geometry;
}

function initScene(canvas, width, height, pixelRatio = 1) {
  try {
    scene = new THREE.Scene();

    // Generous camera distance so the orb never cuts off at viewport edges
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.6;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    const pr = Math.min(pixelRatio, 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);

    const geometry = createFibonacciSphereGeometry(2400, 0.96);

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uSpeed: { value: 0.18 },
        uNoiseFreq: { value: 1.2 },
        uNoiseAmp: { value: 0.042 },
        uPointSize: { value: 3.6 * pr },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    isRunning = true;
    lastTime = performance.now();
    currentSpeed = 0.35;
    requestAnimationFrame(animate);

    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', error: err?.message || String(err) });
  }
}

function animate(currentTime) {
  if (!isRunning || !renderer || !scene || !camera || !pointCloud || !material) return;

  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  totalTime += delta * currentSpeed;
  material.uniforms.uTime.value = totalTime;

  // Serene meditative rotation + smooth mouse tilt
  pointCloud.rotation.y += delta * 0.07;
  pointCloud.rotation.x += (targetRotX - pointCloud.rotation.x) * 0.05;
  pointCloud.rotation.z += (targetRotY - pointCloud.rotation.z) * 0.05;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'init') {
    const { canvas, width, height, pixelRatio } = e.data;
    initScene(canvas, width, height, pixelRatio);
  } else if (type === 'resize') {
    const { width, height, pixelRatio } = e.data;
    if (renderer && camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (pixelRatio) renderer.setPixelRatio(Math.min(pixelRatio, 2));
      renderer.setSize(width, height, false);
    }
  } else if (type === 'mousemove') {
    const { x, y } = e.data;
    targetRotX = y * 0.35;
    targetRotY = -x * 0.35;
  } else if (type === 'dispose') {
    isRunning = false;
    if (renderer) renderer.dispose();
    if (material) material.dispose();
  }
};
