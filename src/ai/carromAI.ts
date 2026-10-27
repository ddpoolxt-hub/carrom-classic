/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty, Piece, PieceType, Vector2D } from '../types/carrom';
import {
  BASELINE_MAX_X,
  BASELINE_MIN_X,
  BASELINE_TOP_Y,
  COIN_RADIUS,
  POCKET_CENTERS,
  STRIKER_RADIUS,
  findSafeBaselineX,
  isStrikerPlacementValid,
} from '../physics/carromPhysics';
import { dist, length, normalize, sub } from '../physics/vector';

export interface AIShotDecision {
  baselineX: number;
  aimAngle: number;
  power: number;
  targetPieceId: string | null;
}

export function computeAIShot(
  striker: Piece,
  pieces: Piece[],
  aiTargetType: PieceType | null,
  difficulty: AIDifficulty,
  baselineY: number = BASELINE_TOP_Y
): AIShotDecision {
  const eligibleCoins = pieces.filter(
    (p) => !p.isPocketed && !p.isSinking && p.type !== 'striker'
  );

  if (eligibleCoins.length === 0) {
    return {
      baselineX: 400,
      aimAngle: Math.PI / 2,
      power: 50,
      targetPieceId: null,
    };
  }

  let targetPool = eligibleCoins;
  if (aiTargetType) {
    const preferred = eligibleCoins.filter(
      (p) => p.type === aiTargetType || p.type === 'queen'
    );
    if (preferred.length > 0) {
      targetPool = preferred;
    }
  }

  interface CandidateShot {
    baselineX: number;
    aimAngle: number;
    power: number;
    score: number;
    targetPieceId: string;
  }

  const candidates: CandidateShot[] = [];
  const xSamples = [240, 280, 320, 360, 400, 440, 480, 520, 560];

  for (const startX of xSamples) {
    const safeX = findSafeBaselineX(striker, pieces, startX, baselineY);
    if (!isStrikerPlacementValid(striker, pieces, safeX, baselineY)) continue;

    const strikerPos: Vector2D = { x: safeX, y: baselineY };

    for (const coin of targetPool) {
      const coinPos: Vector2D = { x: coin.x, y: coin.y };

      for (const pocket of POCKET_CENTERS) {
        const toPocket = sub(pocket, coinPos);
        const coinToPocketDist = length(toPocket);
        if (coinToPocketDist === 0) continue;
        const pocketDir = normalize(toPocket);

        const contactPoint: Vector2D = {
          x: coinPos.x - pocketDir.x * (COIN_RADIUS + STRIKER_RADIUS),
          y: coinPos.y - pocketDir.y * (COIN_RADIUS + STRIKER_RADIUS),
        };

        const toContact = sub(contactPoint, strikerPos);
        const strikerToContactDist = length(toContact);
        if (strikerToContactDist === 0) continue;
        const strikeDir = normalize(toContact);

        const cutQuality = strikeDir.x * pocketDir.x + strikeDir.y * pocketDir.y;
        if (cutQuality < 0.1) continue;

        let coinPathBlocked = false;
        for (const other of eligibleCoins) {
          if (other.id === coin.id) continue;
          if (isPointNearSegment({ x: other.x, y: other.y }, coinPos, pocket, COIN_RADIUS * 1.8)) {
            coinPathBlocked = true;
            break;
          }
        }

        let strikerPathBlocked = false;
        for (const other of eligibleCoins) {
          if (other.id === coin.id) continue;
          if (isPointNearSegment({ x: other.x, y: other.y }, strikerPos, contactPoint, COIN_RADIUS * 1.7)) {
            strikerPathBlocked = true;
            break;
          }
        }

        let score = cutQuality * 100;
        score -= (coinToPocketDist / 800) * 35;
        score -= (strikerToContactDist / 800) * 25;

        if (coin.type === 'queen') score += 30;
        if (coin.type === aiTargetType) score += 20;
        if (coinPathBlocked) score -= 65;
        if (strikerPathBlocked) score -= 60;

        const totalDist = strikerToContactDist + coinToPocketDist * 1.2;
        const basePower = Math.min(88, Math.max(30, totalDist / 8 + 15));

        candidates.push({
          baselineX: safeX,
          aimAngle: Math.atan2(toContact.y, toContact.x),
          power: basePower,
          score,
          targetPieceId: coin.id,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0 || candidates[0].score < -30) {
    const fallbackX = findSafeBaselineX(striker, pieces, 400, baselineY);
    const closestCoin = targetPool.reduce((closest, curr) => {
      const d1 = dist({ x: fallbackX, y: baselineY }, { x: closest.x, y: closest.y });
      const d2 = dist({ x: fallbackX, y: baselineY }, { x: curr.x, y: curr.y });
      return d2 < d1 ? curr : closest;
    }, targetPool[0]);

    const angle = Math.atan2(closestCoin.y - baselineY, closestCoin.x - fallbackX);
    return {
      baselineX: fallbackX,
      aimAngle: angle,
      power: 65,
      targetPieceId: closestCoin.id,
    };
  }

  const top = candidates[0];
  let angleJitter = 0;
  let powerJitter = 0;

  if (difficulty === 'easy') {
    angleJitter = (Math.random() - 0.5) * 0.16;
    powerJitter = (Math.random() - 0.5) * 20;
  } else if (difficulty === 'normal') {
    angleJitter = (Math.random() - 0.5) * 0.05;
    powerJitter = (Math.random() - 0.5) * 8;
  } else {
    angleJitter = (Math.random() - 0.5) * 0.015;
    powerJitter = (Math.random() - 0.5) * 3;
  }

  return {
    baselineX: Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, top.baselineX)),
    aimAngle: top.aimAngle + angleJitter,
    power: Math.max(25, Math.min(95, top.power + powerJitter)),
    targetPieceId: top.targetPieceId,
  };
}

function isPointNearSegment(
  p: Vector2D,
  a: Vector2D,
  b: Vector2D,
  threshold: number
): boolean {
  const l2 = dist(a, b);
  if (l2 === 0) return dist(p, a) < threshold;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l2 * l2)
    )
  );
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
  return dist(p, projection) < threshold;
}
