import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateArScale,
  calculatePhysicalDimensions,
  calculateTargetDiameterFromScale
} from '../src/lib/utils/arSizing.ts';

test('arSizing: calculates exact scale for 9 cm target diameter on pizza model', () => {
  // Raw pizza GLB geometry: Width = 0.8418 m, Height = 0.0435 m, Depth = 0.8418 m
  const rawDimensions = { x: 0.8418, y: 0.0435, z: 0.8418 };
  const rawMaxMeters = 0.8418;
  const targetDiameterCm = 9.0;

  const arScale = calculateArScale({
    rawMaxMeters,
    targetDiameterCm,
    calibrationFactor: 1.0
  });

  // Target 9 cm / 84.18 cm raw = ~0.106914
  assert.ok(arScale > 0.106 && arScale < 0.107, `Expected arScale ~0.1069, got ${arScale}`);

  // Placed physical dimensions in AR
  const placed = calculatePhysicalDimensions({
    rawDimensions,
    arScale,
    calibrationFactor: 1.0
  });

  assert.equal(placed.diameter, 9.0, 'Placed diameter must be exactly 9.0 cm');
  assert.equal(placed.width, 9.0, 'Placed width must be exactly 9.0 cm');
  assert.equal(placed.depth, 9.0, 'Placed depth must be exactly 9.0 cm');
  assert.ok(placed.height > 0.4 && placed.height < 0.6, 'Height proportional to pizza thickness');
});

test('arSizing: calculates exact scale for 20 cm target diameter (default normal plate)', () => {
  const rawDimensions = { x: 0.8418, y: 0.0435, z: 0.8418 };
  const rawMaxMeters = 0.8418;
  const targetDiameterCm = 20.0;

  const arScale = calculateArScale({
    rawMaxMeters,
    targetDiameterCm,
    calibrationFactor: 1.0
  });

  const placed = calculatePhysicalDimensions({
    rawDimensions,
    arScale,
    calibrationFactor: 1.0
  });

  assert.equal(placed.diameter, 20.0, 'Placed diameter must be exactly 20.0 cm');
});

test('arSizing: supports explicit calibration factor for non-standard assets', () => {
  // If a 3D scan was authored at 2x scale (e.g. radius exported as diameter),
  // calibrationFactor = 0.5 compensates so real-world size is accurate
  const rawDimensions = { x: 0.8418, y: 0.0435, z: 0.8418 };
  const rawMaxMeters = 0.8418;
  const targetDiameterCm = 9.0;
  const calibrationFactor = 0.5;

  const arScale = calculateArScale({
    rawMaxMeters,
    targetDiameterCm,
    calibrationFactor
  });

  const placed = calculatePhysicalDimensions({
    rawDimensions,
    arScale,
    calibrationFactor
  });

  assert.equal(placed.diameter, 9.0, 'Placed diameter with calibration must be exactly 9.0 cm');
});

test('arSizing: target diameter is perfectly invertible from arScale', () => {
  const rawMaxMeters = 0.8418;
  const targetDiameterCm = 25.5;

  const arScale = calculateArScale({
    rawMaxMeters,
    targetDiameterCm,
    calibrationFactor: 1.0
  });

  const invertedCm = calculateTargetDiameterFromScale({
    rawMaxMeters,
    arScale,
    calibrationFactor: 1.0
  });

  assert.equal(invertedCm, 25.5, 'Inverted diameter should match original target');
});
