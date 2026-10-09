/**
 * worker.js
 * Web Worker for OffscreenCanvas Three.js WebGL Rendering
 * Runs entirely off the main UI thread.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

let renderer = null;
let scene = null;
let camera = null;
let pointCloud = null;
let material = null;
let isRunning = false;

let targetRotX = 0;
let targetRotY = 0;
let speed = 0.8;
let lastTime = 0;
let totalTime = 0;

// Vertex Shader (Embedded for self-contained execution)
const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uNoiseFreq;
uniform float uNoiseAmp;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec3 p = position;
  float t = uTime * uSpeed;

  float n1 = snoise(p * uNoiseFreq + vec3(0.0, t * 0.7, t * 0.4));
  float n2 = snoise(p * (uNoiseFreq * 1.8) - vec3(t * 0.45, 0.0, t * 0.55)) * 0.4;

  // Controlled displacement amplitude
  float displacement = (n1 * 0.7 + n2 * 0.3) * uNoiseAmp;
  vec3 newPosition = position + normal * displacement;

  vPosition = newPosition;
  vNormal = normalize(normalMatrix * normal);
  vDisplacement = displacement;

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;

  float sizeBonus = smoothstep(-uNoiseAmp, uNoiseAmp, displacement) * 0.5;
  gl_PointSize = (3.4 + sizeBonus) * (4.8 / max(0.1, -mvPosition.z));
}
`;

// Fragment Shader (Embedded)
const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }
  float particleMask = smoothstep(0.5, 0.06, dist);

  // Dynamic iridescent color flow that sweeps across the sphere
  float flow = sin(vPosition.x * 2.2 + vPosition.y * 1.6 + uTime * 0.85) * 0.32
             + cos(vPosition.z * 1.8 - vPosition.y * 1.1 + uTime * 0.65) * 0.22;

  float gradFactor = clamp((vPosition.x * 0.5 + 0.5) + flow + vDisplacement * 3.2, 0.0, 1.0);

  vec3 neonMagenta  = vec3(1.0, 0.04, 0.58);  // #ff0a94
  vec3 royalViolet  = vec3(0.55, 0.15, 0.98); // #8c26fa
  vec3 electricCyan = vec3(0.0, 0.90, 1.0);   // #00e5ff
  vec3 pureWhite    = vec3(1.0, 1.0, 1.0);

  vec3 baseColor;
  if (gradFactor < 0.5) {
    baseColor = mix(neonMagenta, royalViolet, gradFactor * 2.0);
  } else {
    baseColor = mix(royalViolet, electricCyan, (gradFactor - 0.5) * 2.0);
  }

  // Edge / Rim Fresnel Glow
  vec3 viewDir = normalize(vViewPosition);
  vec3 norm = normalize(vNormal);
  float fresnel = 1.0 - abs(dot(norm, viewDir));
  fresnel = pow(fresnel, 2.0);

  // Bright white highlight on outer edges
  vec3 finalColor = mix(baseColor, pureWhite, fresnel * 0.7);
  finalColor += pureWhite * smoothstep(0.012, 0.048, vDisplacement) * 0.35;

  float shimmer = sin(uTime * 1.3 + vPosition.y * 3.5 + vPosition.x * 2.5) * 0.1;
  finalColor += electricCyan * max(0.0, shimmer);

  float alpha = particleMask * (0.65 + fresnel * 0.35);
  gl_FragColor = vec4(finalColor * (0.9 + fresnel * 0.4), alpha);
}
`;

function createFibonacciSphereGeometry(numPoints = 2400, radius = 0.96) {
  const positions = new Float32Array(numPoints * 3);
  const normals = new Float32Array(numPoints * 3);
  const phi = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < numPoints; i++) {
    const theta = 2 * Math.PI * i / phi;
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
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040714); // Dark deep navy void

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 5.6;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'default',
  });
  renderer.setPixelRatio(Math.min(pixelRatio, 1.5));
  renderer.setSize(width, height, false); // false avoids style access on OffscreenCanvas

  const geometry = createFibonacciSphereGeometry(2400, 0.96);

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uSpeed: { value: 1.0 },
      uNoiseFreq: { value: 1.25 },
      uNoiseAmp: { value: 0.058 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  pointCloud = new THREE.Points(geometry, material);
  scene.add(pointCloud);

  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function animate(currentTime) {
  if (!isRunning || !renderer || !scene || !camera || !pointCloud || !material) return;

  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  totalTime += delta * 0.9;

  material.uniforms.uTime.value = totalTime;

  // Gentle idle rotation and mouse parallax damping
  pointCloud.rotation.y += delta * 0.15;
  pointCloud.rotation.x += (targetRotX - pointCloud.rotation.x) * 0.06;
  pointCloud.rotation.z += (targetRotY - pointCloud.rotation.z) * 0.06;

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
    targetRotX = y * 0.14;
    targetRotY = -x * 0.14;
  } else if (type === 'setSpeed') {
    speed = e.data.speed;
  }
};
