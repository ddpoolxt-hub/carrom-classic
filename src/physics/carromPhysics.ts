/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Piece, PieceType, Vector2D } from '../types/carrom';
import { dist, distSq, length } from './vector';

export const BOARD_SIZE = 800;
export const FRAME_WIDTH = 48;
export const PLAY_AREA_MIN = FRAME_WIDTH;
export const PLAY_AREA_MAX = BOARD_SIZE - FRAME_WIDTH;

export const COIN_RADIUS = 16.5;
export const STRIKER_RADIUS = 21.5;
export const POCKET_RADIUS = 36;
export const POCKET_DROP_RADIUS = 24;

export const POCKET_CENTERS: Vector2D[] = [
  { x: 74, y: 74 },     // Top-Left
  { x: 726, y: 74 },    // Top-Right
  { x: 74, y: 726 },    // Bottom-Left
  { x: 726, y: 726 },   // Bottom-Right
];

// Baseline parameters
export const BASELINE_BOTTOM_Y = 636;
export const BASELINE_TOP_Y = 164;
export const BASELINE_MIN_X = 224;
export const BASELINE_MAX_X = 576;
export const BASELINE_CIRCLE_RADIUS = 20;

export const FRICTION_RATES = {
  slick: 0.989,
  normal: 0.985,
  low: 0.981,
};

export const RESTITUTION_COIN = 0.92;
export const RESTITUTION_WALL = 0.86;

/**
 * Creates the initial classic Carrom setup (19 pieces: 1 Queen, 9 White, 9 Black)
 */
export function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];
  const centerX = 400;
  const centerY = 400;

  // 1. Red Queen at center
  pieces.push({
    id: 'queen',
    type: 'queen',
    x: centerX,
    y: centerY,
    vx: 0,
    vy: 0,
    radius: COIN_RADIUS,
    mass: 1.0,
    color: '#DC2626', // rich carrom red
    highlightColor: '#F87171',
    isPocketed: false,
    pocketScale: 1.0,
    pocketAlpha: 1.0,
    isSinking: false,
  });

  // 2. Inner ring: 6 coins alternating (White, Black, White, Black, White, Black)
  const innerRadius = COIN_RADIUS * 2 + 0.5;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const type: PieceType = i % 2 === 0 ? 'white' : 'black';
    pieces.push({
      id: `inner_${i}_${type}`,
      type,
      x: centerX + Math.cos(angle) * innerRadius,
      y: centerY + Math.sin(angle) * innerRadius,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: 1.0,
      color: type === 'white' ? '#F5F5F0' : '#1C1917',
      highlightColor: type === 'white' ? '#FFFFFF' : '#44403C',
      isPocketed: false,
      pocketScale: 1.0,
      pocketAlpha: 1.0,
      isSinking: false,
    });
  }

  // 3. Outer ring: 12 coins tightly packed around inner ring
  // 6 corner coins at distance 2 * innerRadius = 4 * COIN_RADIUS
  // 6 edge coins at distance innerRadius * sqrt(3)
  const cornerDist = innerRadius * 2;
  const edgeDist = innerRadius * Math.sqrt(3);

  for (let i = 0; i < 6; i++) {
    // Corner coin
    const cornerAngle = (i * Math.PI) / 3;
    const cornerType: PieceType = i % 2 === 1 ? 'white' : 'black'; // Alternating pattern
    pieces.push({
      id: `outer_corner_${i}_${cornerType}`,
      type: cornerType,
      x: centerX + Math.cos(cornerAngle) * cornerDist,
      y: centerY + Math.sin(cornerAngle) * cornerDist,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: 1.0,
      color: cornerType === 'white' ? '#F5F5F0' : '#1C1917',
      highlightColor: cornerType === 'white' ? '#FFFFFF' : '#44403C',
      isPocketed: false,
      pocketScale: 1.0,
      pocketAlpha: 1.0,
      isSinking: false,
    });

    // Edge coin (between two corners)
    const edgeAngle = cornerAngle + Math.PI / 6;
    const edgeType: PieceType = cornerType === 'white' ? 'black' : 'white';
    pieces.push({
      id: `outer_edge_${i}_${edgeType}`,
      type: edgeType,
      x: centerX + Math.cos(edgeAngle) * edgeDist,
      y: centerY + Math.sin(edgeAngle) * edgeDist,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: 1.0,
      color: edgeType === 'white' ? '#F5F5F0' : '#1C1917',
      highlightColor: edgeType === 'white' ? '#FFFFFF' : '#44403C',
      isPocketed: false,
      pocketScale: 1.0,
      pocketAlpha: 1.0,
      isSinking: false,
    });
  }

  return pieces;
}

/**
 * Creates or resets the Striker piece
 */
export function createStriker(
  x: number = 400,
  y: number = BASELINE_BOTTOM_Y,
  skin: string = 'classic_ivory'
): Piece {
  let color = '#FFFBEB';
  let highlightColor = '#FEF08A';

  if (skin === 'royal_ruby') {
    color = '#B91C1C';
    highlightColor = '#F87171';
  } else if (skin === 'gold_champion') {
    color = '#D97706';
    highlightColor = '#FDE68A';
  } else if (skin === 'neon_emerald') {
    color = '#059669';
    highlightColor = '#6EE7B7';
  }

  return {
    id: 'striker',
    type: 'striker',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    mass: 3.2,
    color,
    highlightColor,
    isPocketed: false,
    pocketScale: 1.0,
    pocketAlpha: 1.0,
    isSinking: false,
  };
}

/**
 * Runs physics update sub-steps for precision and smooth continuous collision resolution
 */
export function updatePhysics(
  pieces: Piece[],
  frictionRate: number,
  onCollision: (intensity: number) => void,
  onCushion: (intensity: number) => void,
  onPocket: (piece: Piece) => void
): { hasMovement: boolean; pocketedList: Piece[] } {
  const SUB_STEPS = 5;
  const stepFriction = Math.pow(frictionRate, 1 / SUB_STEPS);
  const newlyPocketed: Piece[] = [];
  let anyMoving = false;

  for (let step = 0; step < SUB_STEPS; step++) {
    // 1. Move all active non-pocketed pieces
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.isPocketed) continue;

      if (p.isSinking && p.sinkTarget) {
        // Smoothly pull into pocket center and shrink
        const dx = p.sinkTarget.x - p.x;
        const dy = p.sinkTarget.y - p.y;
        p.x += dx * 0.15;
        p.y += dy * 0.15;
        p.vx *= 0.5;
        p.vy *= 0.5;
        p.pocketScale = Math.max(0, p.pocketScale - 0.08);
        p.pocketAlpha = Math.max(0, p.pocketAlpha - 0.08);

        anyMoving = true;
        if (p.pocketScale <= 0.05) {
          p.isPocketed = true;
          p.isSinking = false;
          p.pocketScale = 0;
          p.pocketAlpha = 0;
          newlyPocketed.push(p);
          onPocket(p);
        }
        continue;
      }

      // Normal movement
      if (Math.abs(p.vx) > 0.001 || Math.abs(p.vy) > 0.001) {
        p.x += p.vx / SUB_STEPS;
        p.y += p.vy / SUB_STEPS;
        p.vx *= stepFriction;
        p.vy *= stepFriction;

        // Velocity threshold cutoff to prevent infinite crawling
        if (length({ x: p.vx, y: p.vy }) < 0.06) {
          p.vx = 0;
          p.vy = 0;
        } else {
          anyMoving = true;
        }
      }

      // Check pocket suction
      for (const pocket of POCKET_CENTERS) {
        const dSq = distSq({ x: p.x, y: p.y }, pocket);
        const captureRadius = POCKET_RADIUS + p.radius * 0.45;
        if (dSq < captureRadius * captureRadius) {
          const d = Math.sqrt(dSq);
          if (d < POCKET_DROP_RADIUS) {
            // Sunk into pocket!
            p.isSinking = true;
            p.sinkTarget = pocket;
            anyMoving = true;
            break;
          } else {
            // Suction pull towards pocket center
            const pullForce = 0.4 * (1 - d / captureRadius);
            const nx = (pocket.x - p.x) / d;
            const ny = (pocket.y - p.y) / d;
            p.vx += nx * pullForce;
            p.vy += ny * pullForce;
            anyMoving = true;
          }
        }
      }

      // Cushion walls collision
      // Avoid rebounding if falling into pocket
      if (!p.isSinking) {
        const minX = PLAY_AREA_MIN + p.radius;
        const maxX = PLAY_AREA_MAX - p.radius;
        const minY = PLAY_AREA_MIN + p.radius;
        const maxY = PLAY_AREA_MAX - p.radius;

        // Left cushion
        if (p.x < minX) {
          // Check if not inside pocket mouth
          if (!isNearCornerPocket(p.x, p.y)) {
            p.x = minX;
            p.vx = -p.vx * RESTITUTION_WALL;
            if (Math.abs(p.vx) > 0.4) onCushion(Math.abs(p.vx) / 10);
          }
        }
        // Right cushion
        if (p.x > maxX) {
          if (!isNearCornerPocket(p.x, p.y)) {
            p.x = maxX;
            p.vx = -p.vx * RESTITUTION_WALL;
            if (Math.abs(p.vx) > 0.4) onCushion(Math.abs(p.vx) / 10);
          }
        }
        // Top cushion
        if (p.y < minY) {
          if (!isNearCornerPocket(p.x, p.y)) {
            p.y = minY;
            p.vy = -p.vy * RESTITUTION_WALL;
            if (Math.abs(p.vy) > 0.4) onCushion(Math.abs(p.vy) / 10);
          }
        }
        // Bottom cushion
        if (p.y > maxY) {
          if (!isNearCornerPocket(p.x, p.y)) {
            p.y = maxY;
            p.vy = -p.vy * RESTITUTION_WALL;
            if (Math.abs(p.vy) > 0.4) onCushion(Math.abs(p.vy) / 10);
          }
        }
      }
    }

    // 2. Inter-piece collisions (elastic impulse resolution)
    for (let i = 0; i < pieces.length; i++) {
      const p1 = pieces[i];
      if (p1.isPocketed || p1.isSinking) continue;

      for (let j = i + 1; j < pieces.length; j++) {
        const p2 = pieces[j];
        if (p2.isPocketed || p2.isSinking) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dSq = dx * dx + dy * dy;
        const minDist = p1.radius + p2.radius;

        if (dSq < minDist * minDist && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d;
          const ny = dy / d;

          // Separate overlapping pieces
          const overlap = minDist - d;
          const totalMass = p1.mass + p2.mass;
          const sep1 = (overlap * (p2.mass / totalMass));
          const sep2 = (overlap * (p1.mass / totalMass));

          p1.x -= nx * sep1;
          p1.y -= ny * sep1;
          p2.x += nx * sep2;
          p2.y += ny * sep2;

          // Relative velocity along normal
          const rvx = p2.vx - p1.vx;
          const rvy = p2.vy - p1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          // Only resolve if moving towards each other
          if (velAlongNormal < 0) {
            const impulse = -(1 + RESTITUTION_COIN) * velAlongNormal / (1 / p1.mass + 1 / p2.mass);
            const impX = impulse * nx;
            const impY = impulse * ny;

            p1.vx -= impX / p1.mass;
            p1.vy -= impY / p1.mass;
            p2.vx += impX / p2.mass;
            p2.vy += impY / p2.mass;

            const impactSpeed = Math.abs(velAlongNormal);
            if (impactSpeed > 0.3) {
              onCollision(Math.min(1.0, impactSpeed / 8));
            }
            anyMoving = true;
          }
        }
      }
    }
  }

  return { hasMovement: anyMoving, pocketedList: newlyPocketed };
}

/**
 * Checks if a point is within the corner pocket cut-out region
 */
function isNearCornerPocket(x: number, y: number): boolean {
  for (const p of POCKET_CENTERS) {
    if (distSq({ x, y }, p) < (POCKET_RADIUS + 12) * (POCKET_RADIUS + 12)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if striker placement on baseline is valid (not overlapping existing coins)
 */
export function isStrikerPlacementValid(
  striker: Piece,
  pieces: Piece[],
  x: number,
  y: number
): boolean {
  for (const p of pieces) {
    if (p.id === striker.id || p.isPocketed) continue;
    const d = dist({ x, y }, { x: p.x, y: p.y });
    if (d < striker.radius + p.radius) {
      return false;
    }
  }
  return true;
}

/**
 * Finds a safe baseline X position if current is obstructed
 */
export function findSafeBaselineX(
  striker: Piece,
  pieces: Piece[],
  targetX: number,
  y: number
): number {
  if (isStrikerPlacementValid(striker, pieces, targetX, y)) {
    return targetX;
  }
  // Search outward left and right
  const step = 6;
  for (let offset = step; offset <= 200; offset += step) {
    const leftX = targetX - offset;
    if (leftX >= BASELINE_MIN_X && isStrikerPlacementValid(striker, pieces, leftX, y)) {
      return leftX;
    }
    const rightX = targetX + offset;
    if (rightX <= BASELINE_MAX_X && isStrikerPlacementValid(striker, pieces, rightX, y)) {
      return rightX;
    }
  }
  return targetX;
}
