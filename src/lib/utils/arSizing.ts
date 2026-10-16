/**
 * arSizing.ts
 * ─────────────────────────────────────────────────────────────────
 * Authoritative physical dimension & scale calculation engine for WebAR.
 *
 * Distinguishes:
 * 1. Raw Model Geometry: Unscaled bounding box (x, y, z) in meters from the GLB.
 * 2. Calibration Factor: Multiplier applied when an asset's mesh coordinates
 *    or photogrammetry units deviate from standard meters (default: 1.0).
 * 3. Target Physical Dimensions: The intended real-world size in centimetres.
 * 4. Model Scale (ar_scale): The dimensionless multiplier passed to
 *    <model-viewer scale="..."> which AR engines (WebXR, Scene Viewer, Quick Look)
 *    apply to the 3D mesh in physical space.
 *
 * Mathematical Guarantee:
 *   ar_scale = (targetDiameterCm / 100) / (rawMaxMeters * calibrationFactor)
 *   placedDiameterCm = (rawMaxMeters * ar_scale * calibrationFactor) * 100 === targetDiameterCm
 */

export interface Dimensions3D {
  x: number; // Width (Side-to-side) in meters
  y: number; // Height (Bottom-to-top) in meters
  z: number; // Depth (Front-to-back) in meters
}

export interface PhysicalDimensionsCm {
  width: number;  // cm
  height: number; // cm
  depth: number;  // cm
  diameter: number; // planar footprint max(width, depth) in cm
}

/**
 * Calculates the exact ar_scale multiplier to pass to <model-viewer>.
 */
export function calculateArScale(config: {
  rawMaxMeters: number;
  targetDiameterCm: number;
  calibrationFactor?: number;
}): number {
  const { rawMaxMeters, targetDiameterCm, calibrationFactor = 1.0 } = config;
  if (!rawMaxMeters || rawMaxMeters <= 0 || !targetDiameterCm || targetDiameterCm <= 0) {
    return 1.0;
  }
  const effectiveMaxMeters = rawMaxMeters * (calibrationFactor > 0 ? calibrationFactor : 1.0);
  if (effectiveMaxMeters <= 0) return 1.0;

  const targetMeters = targetDiameterCm / 100;
  return Number((targetMeters / effectiveMaxMeters).toFixed(6));
}

/**
 * Calculates the resulting real-world physical dimensions in centimetres
 * when a given ar_scale is applied.
 */
export function calculatePhysicalDimensions(config: {
  rawDimensions: Dimensions3D;
  arScale: number;
  calibrationFactor?: number;
}): PhysicalDimensionsCm {
  const { rawDimensions, arScale, calibrationFactor = 1.0 } = config;
  const effectiveScale = arScale * (calibrationFactor > 0 ? calibrationFactor : 1.0);

  const width = rawDimensions.x * effectiveScale * 100;
  const height = rawDimensions.y * effectiveScale * 100;
  const depth = rawDimensions.z * effectiveScale * 100;
  const diameter = Math.max(width, depth);

  return {
    width: Number(width.toFixed(1)),
    height: Number(height.toFixed(1)),
    depth: Number(depth.toFixed(1)),
    diameter: Number(diameter.toFixed(1)),
  };
}

/**
 * Computes the target physical diameter in cm corresponding to a given ar_scale.
 */
export function calculateTargetDiameterFromScale(config: {
  rawMaxMeters: number;
  arScale: number;
  calibrationFactor?: number;
}): number {
  const { rawMaxMeters, arScale, calibrationFactor = 1.0 } = config;
  if (!rawMaxMeters || rawMaxMeters <= 0 || !arScale || arScale <= 0) {
    return 20.0; // default 20 cm
  }
  const effectiveMaxMeters = rawMaxMeters * (calibrationFactor > 0 ? calibrationFactor : 1.0);
  const targetMeters = arScale * effectiveMaxMeters;
  return Number((targetMeters * 100).toFixed(1));
}
