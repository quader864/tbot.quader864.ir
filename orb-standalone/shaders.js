/**
 * Custom GLSL Shaders for the 3D Bioluminescent Point-Cloud Orb
 */

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uPointSize;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

// 3D Simplex Noise by Ian McEwan & Stefan Gustavson (Ashima Arts)
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

  // Displace points organically along their sphere normal vector
  vec3 newPosition = position + normal * displacement;

  vPosition = newPosition;
  vNormal = normalize(normalMatrix * normal);
  vDisplacement = displacement;

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation with camera depth and wave crest expansion
  float crestBonus = smoothstep(-uNoiseAmp, uNoiseAmp, displacement) * 0.6;
  float basePtSize = uPointSize > 0.0 ? uPointSize : 3.6;
  gl_PointSize = (basePtSize + crestBonus) * (4.8 / max(0.1, -mvPosition.z));
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

void main() {
  // Soft circular bioluminescent particle disk
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

  vec3 neonMagenta   = vec3(1.0, 0.04, 0.62);  // Electric Magenta (#ff0a9e)
  vec3 royalViolet   = vec3(0.52, 0.16, 0.98); // Deep Violet (#8529fa)
  vec3 electricCyan  = vec3(0.0, 0.92, 1.0);   // Neon Cyan (#00ebff)
  vec3 pureWhite     = vec3(1.0, 1.0, 1.0);

  vec3 baseColor;
  if (gradFactor < 0.5) {
    baseColor = mix(neonMagenta, royalViolet, gradFactor * 2.0);
  } else {
    baseColor = mix(royalViolet, electricCyan, (gradFactor - 0.5) * 2.0);
  }

  // Camera angle Fresnel rim glow
  vec3 viewDir = normalize(vViewPosition);
  vec3 norm = normalize(vNormal);
  float fresnel = 1.0 - abs(dot(norm, viewDir));
  fresnel = pow(fresnel, 2.0);

  // Bright white highlight on outer edges
  vec3 finalColor = mix(baseColor, pureWhite, fresnel * 0.7);

  // Wave crest highlights
  finalColor += pureWhite * smoothstep(0.012, 0.048, vDisplacement) * 0.35;

  float shimmer = sin(uTime * 1.3 + vPosition.y * 3.5 + vPosition.x * 2.5) * 0.1;
  finalColor += electricCyan * max(0.0, shimmer);

  // Bioluminescent particle intensity for AdditiveBlending
  float alpha = particleMask * (0.65 + fresnel * 0.35);

  gl_FragColor = vec4(finalColor * (0.9 + fresnel * 0.4), alpha);
}
`;
