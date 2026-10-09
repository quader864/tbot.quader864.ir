// fragment.glsl
// Custom GLSL Fragment Shader: Neon Magenta to Cyan Gradient & Fresnel Rim Highlights
precision highp float;

uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

void main() {
  // Soft circular bioluminescent particle shape
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }
  float particleMask = smoothstep(0.5, 0.06, dist);

  // Dynamic iridescent color flow that sweeps across the sphere surface
  float flow = sin(vPosition.x * 2.2 + vPosition.y * 1.6 + uTime * 0.85) * 0.32
             + cos(vPosition.z * 1.8 - vPosition.y * 1.1 + uTime * 0.65) * 0.22;

  float gradFactor = clamp((vPosition.x * 0.5 + 0.5) + flow + vDisplacement * 3.2, 0.0, 1.0);

  vec3 neonMagenta  = vec3(1.0, 0.04, 0.58);  // Electric Magenta (#ff0a94)
  vec3 royalViolet  = vec3(0.55, 0.15, 0.98); // Deep Violet (#8c26fa)
  vec3 electricCyan = vec3(0.0, 0.90, 1.0);   // Neon Cyan (#00e5ff)
  vec3 pureWhite    = vec3(1.0, 1.0, 1.0);

  // Multi-stop gradient
  vec3 baseColor;
  if (gradFactor < 0.5) {
    baseColor = mix(neonMagenta, royalViolet, gradFactor * 2.0);
  } else {
    baseColor = mix(royalViolet, electricCyan, (gradFactor - 0.5) * 2.0);
  }

  // Edge / Rim Fresnel Glow based on view angle relative to camera
  vec3 viewDir = normalize(vViewPosition);
  vec3 norm = normalize(vNormal);
  float fresnel = 1.0 - abs(dot(norm, viewDir));
  fresnel = pow(fresnel, 2.0);

  // Bright white highlight on outer edges
  vec3 finalColor = mix(baseColor, pureWhite, fresnel * 0.7);

  // Wave crest highlights that travel with ripples
  finalColor += pureWhite * smoothstep(0.012, 0.048, vDisplacement) * 0.35;

  float shimmer = sin(uTime * 1.3 + vPosition.y * 3.5 + vPosition.x * 2.5) * 0.1;
  finalColor += electricCyan * max(0.0, shimmer);

  // Bioluminescent particle intensity
  float alpha = particleMask * (0.65 + fresnel * 0.35);
  gl_FragColor = vec4(finalColor * (0.9 + fresnel * 0.4), alpha);
}
