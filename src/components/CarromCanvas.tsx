/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Piece, Vector2D } from '../types/carrom';
import {
  BOARD_SIZE,
  FRAME_WIDTH,
  POCKET_CENTERS,
  POCKET_RADIUS,
  BASELINE_BOTTOM_Y,
  BASELINE_TOP_Y,
  BASELINE_MIN_X,
  BASELINE_MAX_X,
  BASELINE_CIRCLE_RADIUS,
  COIN_RADIUS,
  STRIKER_RADIUS,
  PLAY_AREA_MIN,
  PLAY_AREA_MAX,
} from '../physics/carromPhysics';
import { dist, length, normalize, scale, sub } from '../physics/vector';

interface CarromCanvasProps {
  pieces: Piece[];
  striker: Piece;
  currentTurnPlayerId: 'player1' | 'player2';
  isCurrentPlayerAI: boolean;
  isAimingAllowed: boolean;
  boardSkin: 'classic_sheesham' | 'vintage_teak' | 'midnight_birch';
  onShoot: (vx: number, vy: number, power: number) => void;
  onStrikerPositionChange: (newX: number) => void;
  strikerPlacementX: number;
}

export const CarromCanvas: React.FC<CarromCanvasProps> = ({
  pieces,
  striker,
  currentTurnPlayerId,
  isCurrentPlayerAI,
  isAimingAllowed,
  boardSkin,
  onShoot,
  onStrikerPositionChange,
  strikerPlacementX,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Aiming state
  const [isDraggingAim, setIsDraggingAim] = useState(false);
  const [aimVector, setAimVector] = useState<Vector2D>({ x: 0, y: -1 });
  const [aimPower, setAimPower] = useState<number>(45); // 10 to 100

  // Dragging striker baseline state
  const [isDraggingStrikerX, setIsDraggingStrikerX] = useState(false);

  // Compute active baseline Y
  const activeBaselineY = currentTurnPlayerId === 'player1' ? BASELINE_BOTTOM_Y : BASELINE_TOP_Y;

  // Transform screen coordinates to 800x800 board coordinates
  const getBoardCoords = useCallback((clientX: number, clientY: number): Vector2D => {
    if (!canvasRef.current) return { x: 400, y: 400 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Raycast to find collision point for aim assist
  const computeGhostCollision = useCallback(
    (origin: Vector2D, dir: Vector2D): { ghostPos: Vector2D; hitCoin: Piece | null; deflectionDir: Vector2D } | null => {
      let closestDist = Infinity;
      let hitCoin: Piece | null = null;
      let contactPos: Vector2D = { x: 0, y: 0 };

      const activeCoins = pieces.filter(
        (p) => !p.isPocketed && !p.isSinking && p.id !== striker.id
      );

      for (const coin of activeCoins) {
        // Line-sphere intersection
        const toCoin = sub({ x: coin.x, y: coin.y }, origin);
        const projection = toCoin.x * dir.x + toCoin.y * dir.y;

        if (projection <= 0) continue; // Behind origin

        const perpDistSq = toCoin.x * toCoin.x + toCoin.y * toCoin.y - projection * projection;
        const totalRadius = STRIKER_RADIUS + coin.radius;

        if (perpDistSq < totalRadius * totalRadius) {
          const halfChord = Math.sqrt(totalRadius * totalRadius - perpDistSq);
          const travelDist = projection - halfChord;

          if (travelDist > 0 && travelDist < closestDist) {
            closestDist = travelDist;
            hitCoin = coin;
            contactPos = {
              x: origin.x + dir.x * travelDist,
              y: origin.y + dir.y * travelDist,
            };
          }
        }
      }

      if (hitCoin && closestDist < 700) {
        const coinPos = { x: hitCoin.x, y: hitCoin.y };
        const coinDeflection = normalize(sub(coinPos, contactPos));
        return { ghostPos: contactPos, hitCoin, deflectionDir: coinDeflection };
      }

      return null;
    },
    [pieces, striker.id]
  );

  // Input handlers for Drag-to-Aim & Baseline adjustment
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!isAimingAllowed || isCurrentPlayerAI) return;

    const coords = getBoardCoords(clientX, clientY);
    const strikerPos = { x: striker.x, y: striker.y };
    const distToStriker = dist(coords, strikerPos);

    // If tapped near striker or baseline, allow sliding striker or initiating aim
    if (distToStriker <= STRIKER_RADIUS * 1.8) {
      setIsDraggingStrikerX(true);
    } else {
      // Start drag-to-aim
      setIsDraggingAim(true);
      updateAimFromCoords(coords);
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isAimingAllowed || isCurrentPlayerAI) return;

    const coords = getBoardCoords(clientX, clientY);

    if (isDraggingStrikerX) {
      // Constrain to baseline
      const clampedX = Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, coords.x));
      onStrikerPositionChange(clampedX);
    } else if (isDraggingAim) {
      updateAimFromCoords(coords);
    }
  };

  const updateAimFromCoords = (coords: Vector2D) => {
    const strikerPos = { x: striker.x, y: striker.y };
    
    // In carrom drag-to-aim:
    // If pulling backwards like slingshot: direction is opposite of drag
    // If aiming forward towards target: direction is from striker to target
    // We support forward aiming if touched above baseline, or slingshot if pulled below.
    let dragVec = sub(coords, strikerPos);
    
    // Slingshot pull detection: if dragging behind the player's baseline
    const isPullingBack = currentTurnPlayerId === 'player1' ? coords.y > strikerPos.y : coords.y < strikerPos.y;
    if (isPullingBack) {
      dragVec = scale(dragVec, -1);
    }

    const dragDist = length(dragVec);
    if (dragDist > 5) {
      const dir = normalize(dragVec);
      setAimVector(dir);

      // Power scales with drag distance (capped at 100)
      const power = Math.min(100, Math.max(15, (dragDist / 180) * 100));
      setAimPower(power);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingStrikerX) {
      setIsDraggingStrikerX(false);
      return;
    }

    if (isDraggingAim) {
      setIsDraggingAim(false);
      // Shoot with current aimVector and aimPower
      const speed = 7 + (aimPower / 100) * 25; // max speed ~32 px/step
      const vx = aimVector.x * speed;
      const vy = aimVector.y * speed;
      onShoot(vx, vy, aimPower);
    }
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || 400;
    const displayHeight = rect.height || 400;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.resetTransform();
    ctx.scale((displayWidth * dpr) / BOARD_SIZE, (displayHeight * dpr) / BOARD_SIZE);

    // 1. Draw Wooden Frame
    drawBoardFrame(ctx, boardSkin);

    // 2. Draw Playing Surface
    drawPlaySurface(ctx, boardSkin);

    // 3. Draw Traditional Board Markings (Center design, baselines, arrows)
    drawBoardMarkings(ctx, currentTurnPlayerId);

    // 4. Draw Corner Pockets
    drawPockets(ctx);

    // 5. Draw Active Coins
    for (const piece of pieces) {
      if (piece.isPocketed) continue;
      drawCoin(ctx, piece);
    }

    // 6. Draw Striker
    if (!striker.isPocketed) {
      drawStriker(ctx, striker, isAimingAllowed && !isCurrentPlayerAI);
    }

    // 7. Draw Aiming Reticle and Trajectory Ray
    if (isAimingAllowed && !isCurrentPlayerAI && (isDraggingAim || true)) {
      drawAimAssist(ctx, striker, aimVector, aimPower, computeGhostCollision);
    }
  }, [
    pieces,
    striker,
    isAimingAllowed,
    isCurrentPlayerAI,
    isDraggingAim,
    aimVector,
    aimPower,
    currentTurnPlayerId,
    boardSkin,
    computeGhostCollision,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[460px] aspect-square mx-auto select-none touch-none rounded-2xl shadow-2xl p-1 bg-stone-900 border border-stone-800"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-xl cursor-crosshair active:cursor-grabbing"
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
};

// ==================== RENDERING UTILITIES ====================

function drawBoardFrame(ctx: CanvasRenderingContext2D, skin: string) {
  // Beveled polished wooden outer frame
  let woodDark = '#381E11';
  let woodMid = '#4E2A15';
  let woodLight = '#6E3E20';

  if (skin === 'vintage_teak') {
    woodDark = '#3D2514';
    woodMid = '#5B371E';
    woodLight = '#82502C';
  } else if (skin === 'midnight_birch') {
    woodDark = '#18181B';
    woodMid = '#27272A';
    woodLight = '#3F3F46';
  }

  // Outer frame gradient
  const frameGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  frameGrad.addColorStop(0, woodLight);
  frameGrad.addColorStop(0.5, woodMid);
  frameGrad.addColorStop(1, woodDark);

  ctx.fillStyle = frameGrad;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // Wooden mitered corners and subtle border lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, BOARD_SIZE - 8, BOARD_SIZE - 8);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(FRAME_WIDTH - 2, FRAME_WIDTH - 2, BOARD_SIZE - FRAME_WIDTH * 2 + 4, BOARD_SIZE - FRAME_WIDTH * 2 + 4);
}

function drawPlaySurface(ctx: CanvasRenderingContext2D, skin: string) {
  const size = BOARD_SIZE - FRAME_WIDTH * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(FRAME_WIDTH, FRAME_WIDTH, size, size);
  ctx.clip();

  // Natural warm birch plywood gradient
  let surfLight = '#FDE6B0';
  let surfMid = '#F5D491';
  let surfDark = '#E6BC6E';

  if (skin === 'vintage_teak') {
    surfLight = '#E9CFA5';
    surfMid = '#DDB982';
    surfDark = '#C2985B';
  } else if (skin === 'midnight_birch') {
    surfLight = '#E2E8F0';
    surfMid = '#CBD5E1';
    surfDark = '#94A3B8';
  }

  const surfGrad = ctx.createRadialGradient(400, 400, 80, 400, 400, 450);
  surfGrad.addColorStop(0, surfLight);
  surfGrad.addColorStop(0.7, surfMid);
  surfGrad.addColorStop(1, surfDark);

  ctx.fillStyle = surfGrad;
  ctx.fillRect(FRAME_WIDTH, FRAME_WIDTH, size, size);

  // Subtle natural wood grain lines
  ctx.strokeStyle = 'rgba(120, 80, 40, 0.04)';
  ctx.lineWidth = 1.5;
  for (let y = FRAME_WIDTH + 15; y < BOARD_SIZE - FRAME_WIDTH; y += 18) {
    ctx.beginPath();
    ctx.moveTo(FRAME_WIDTH, y + Math.sin(y * 0.05) * 3);
    ctx.bezierCurveTo(
      250,
      y + Math.cos(y * 0.08) * 4,
      550,
      y + Math.sin(y * 0.04) * 4,
      BOARD_SIZE - FRAME_WIDTH,
      y
    );
    ctx.stroke();
  }

  // Inner cushion bounce edges with soft inner shadow
  const shadowGradTop = ctx.createLinearGradient(0, FRAME_WIDTH, 0, FRAME_WIDTH + 14);
  shadowGradTop.addColorStop(0, 'rgba(0,0,0,0.4)');
  shadowGradTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGradTop;
  ctx.fillRect(FRAME_WIDTH, FRAME_WIDTH, size, 14);

  const shadowGradBottom = ctx.createLinearGradient(0, BOARD_SIZE - FRAME_WIDTH, 0, BOARD_SIZE - FRAME_WIDTH - 14);
  shadowGradBottom.addColorStop(0, 'rgba(0,0,0,0.4)');
  shadowGradBottom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGradBottom;
  ctx.fillRect(FRAME_WIDTH, BOARD_SIZE - FRAME_WIDTH - 14, size, 14);

  ctx.restore();
}

function drawBoardMarkings(ctx: CanvasRenderingContext2D, currentTurn: 'player1' | 'player2') {
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#1F1610';

  // 1. Center Circle (Traditional Concentric & Petal motif)
  ctx.beginPath();
  ctx.arc(400, 400, 80, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(400, 400, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#DC2626'; // Red center Queen spot
  ctx.fill();
  ctx.stroke();

  // Concentric ring with 8 decorative petals
  ctx.beginPath();
  ctx.arc(400, 400, 48, 0, Math.PI * 2);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#78350F';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#1F1610';

  // 12 radiating floral petals
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const px = 400 + Math.cos(angle) * 76;
    const py = 400 + Math.sin(angle) * 76;
    ctx.beginPath();
    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#DC2626' : '#1F1610';
    ctx.fill();
  }

  // 2. Baselines (4 sides)
  const drawBaseline = (
    y: number,
    minX: number,
    maxX: number,
    isActivePlayer: boolean
  ) => {
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = isActivePlayer ? '#18181B' : '#573319';

    // Double lines
    ctx.beginPath();
    ctx.moveTo(minX, y - 11);
    ctx.lineTo(maxX, y - 11);
    ctx.moveTo(minX, y + 11);
    ctx.lineTo(maxX, y + 11);
    ctx.stroke();

    // Baseline circles at both ends
    [minX, maxX].forEach((circleX) => {
      ctx.beginPath();
      ctx.arc(circleX, y, BASELINE_CIRCLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
      ctx.stroke();

      // Red inner circle
      ctx.beginPath();
      ctx.arc(circleX, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.stroke();
    });
  };

  // Bottom Baseline (Player 1)
  drawBaseline(BASELINE_BOTTOM_Y, BASELINE_MIN_X, BASELINE_MAX_X, currentTurn === 'player1');

  // Top Baseline (Player 2)
  drawBaseline(BASELINE_TOP_Y, BASELINE_MIN_X, BASELINE_MAX_X, currentTurn === 'player2');

  // Side Baselines (Left & Right decorative standard lines)
  ctx.save();
  ctx.translate(400, 400);
  ctx.rotate(Math.PI / 2);
  ctx.translate(-400, -400);
  drawBaseline(BASELINE_BOTTOM_Y, BASELINE_MIN_X, BASELINE_MAX_X, false);
  drawBaseline(BASELINE_TOP_Y, BASELINE_MIN_X, BASELINE_MAX_X, false);
  ctx.restore();

  // 3. Diagonal Arrows pointing towards pockets
  POCKET_CENTERS.forEach((pocket) => {
    const angle = Math.atan2(pocket.y - 400, pocket.x - 400);
    const startDist = 110;
    const endDist = 380;

    const startX = 400 + Math.cos(angle) * startDist;
    const startY = 400 + Math.sin(angle) * startDist;
    const endX = 400 + Math.cos(angle) * endDist;
    const endY = 400 + Math.sin(angle) * endDist;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#382012';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Arrow circle ring near pocket
    const circleDist = 350;
    const ringX = 400 + Math.cos(angle) * circleDist;
    const ringY = 400 + Math.sin(angle) * circleDist;
    ctx.beginPath();
    ctx.arc(ringX, ringY, 11, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

function drawPockets(ctx: CanvasRenderingContext2D) {
  POCKET_CENTERS.forEach((pocket) => {
    // Metal pocket rim ring
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#71717A';
    ctx.fill();

    // Dark pocket cavity with depth gradient
    const pocketGrad = ctx.createRadialGradient(
      pocket.x - 4,
      pocket.y - 4,
      4,
      pocket.x,
      pocket.y,
      POCKET_RADIUS
    );
    pocketGrad.addColorStop(0, '#09090B');
    pocketGrad.addColorStop(0.8, '#18181B');
    pocketGrad.addColorStop(1, '#27272A');

    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    // Inner mesh net texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawCoin(ctx: CanvasRenderingContext2D, piece: Piece) {
  ctx.save();
  ctx.translate(piece.x, piece.y);
  ctx.scale(piece.pocketScale, piece.pocketScale);
  ctx.globalAlpha = piece.pocketAlpha;

  // Drop shadow
  if (!piece.isSinking) {
    ctx.beginPath();
    ctx.arc(2, 3, piece.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
  }

  // Coin body gradient
  const grad = ctx.createRadialGradient(
    -piece.radius * 0.35,
    -piece.radius * 0.35,
    piece.radius * 0.1,
    0,
    0,
    piece.radius
  );

  if (piece.type === 'queen') {
    grad.addColorStop(0, '#F87171');
    grad.addColorStop(0.6, '#DC2626');
    grad.addColorStop(1, '#991B1B');
  } else if (piece.type === 'white') {
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.7, '#F3F4F6');
    grad.addColorStop(1, '#D1D5DB');
  } else {
    // black coin
    grad.addColorStop(0, '#4B5563');
    grad.addColorStop(0.7, '#1F2937');
    grad.addColorStop(1, '#111827');
  }

  ctx.beginPath();
  ctx.arc(0, 0, piece.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Concentric engraved rings
  ctx.beginPath();
  ctx.arc(0, 0, piece.radius * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = piece.type === 'white' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Center crest dot
  ctx.beginPath();
  ctx.arc(0, 0, piece.radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = piece.type === 'queen' ? '#FDE047' : piece.type === 'white' ? '#4B5563' : '#9CA3AF';
  ctx.fill();

  ctx.restore();
}

function drawStriker(ctx: CanvasRenderingContext2D, striker: Piece, isInteractive: boolean) {
  ctx.save();
  ctx.translate(striker.x, striker.y);
  ctx.scale(striker.pocketScale, striker.pocketScale);
  ctx.globalAlpha = striker.pocketAlpha;

  // Drop shadow
  if (!striker.isSinking) {
    ctx.beginPath();
    ctx.arc(3, 4, striker.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
  }

  // Glossy striker body gradient
  const grad = ctx.createRadialGradient(
    -striker.radius * 0.35,
    -striker.radius * 0.35,
    striker.radius * 0.1,
    0,
    0,
    striker.radius
  );
  grad.addColorStop(0, striker.highlightColor);
  grad.addColorStop(0.65, striker.color);
  grad.addColorStop(1, '#0F172A');

  ctx.beginPath();
  ctx.arc(0, 0, striker.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Striker outer metallic ring
  ctx.beginPath();
  ctx.arc(0, 0, striker.radius - 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Striker decorative concentric star rings
  ctx.beginPath();
  ctx.arc(0, 0, striker.radius * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Center crest
  ctx.beginPath();
  ctx.arc(0, 0, striker.radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Pulsing interactive glow if waiting for human turn
  if (isInteractive && !striker.isSinking) {
    ctx.beginPath();
    ctx.arc(0, 0, striker.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawAimAssist(
  ctx: CanvasRenderingContext2D,
  striker: Piece,
  aimDir: Vector2D,
  power: number,
  computeGhost: (origin: Vector2D, dir: Vector2D) => { ghostPos: Vector2D; hitCoin: Piece | null; deflectionDir: Vector2D } | null
) {
  ctx.save();
  const start = { x: striker.x, y: striker.y };
  const maxGuideLength = 280 + (power / 100) * 220;

  // Aim ray
  const ghostResult = computeGhost(start, aimDir);

  let targetPoint: Vector2D;
  if (ghostResult) {
    targetPoint = ghostResult.ghostPos;
  } else {
    targetPoint = {
      x: start.x + aimDir.x * maxGuideLength,
      y: start.y + aimDir.y * maxGuideLength,
    };
  }

  // 1. Dotted Striker Trajectory line
  ctx.beginPath();
  ctx.setLineDash([6, 6]);
  ctx.moveTo(start.x + aimDir.x * (STRIKER_RADIUS + 4), start.y + aimDir.y * (STRIKER_RADIUS + 4));
  ctx.lineTo(targetPoint.x, targetPoint.y);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Power gauge arc around striker
  const angle = Math.atan2(aimDir.y, aimDir.x);
  const powerAngle = (power / 100) * Math.PI * 0.8;
  ctx.beginPath();
  ctx.arc(start.x, start.y, STRIKER_RADIUS + 8, angle - powerAngle / 2, angle + powerAngle / 2);
  ctx.strokeStyle = power > 70 ? '#EF4444' : power > 40 ? '#F59E0B' : '#10B981';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 3. Ghost Striker at impact point
  if (ghostResult) {
    ctx.beginPath();
    ctx.arc(ghostResult.ghostPos.x, ghostResult.ghostPos.y, STRIKER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 251, 235, 0.35)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();

    // Deflection direction arrow on hit coin
    const coin = ghostResult.hitCoin!;
    const defDir = ghostResult.deflectionDir;
    const arrowLen = 45;
    const coinStart = {
      x: coin.x + defDir.x * (coin.radius + 2),
      y: coin.y + defDir.y * (coin.radius + 2),
    };
    const coinEnd = {
      x: coinStart.x + defDir.x * arrowLen,
      y: coinStart.y + defDir.y * arrowLen,
    };

    ctx.beginPath();
    ctx.moveTo(coinStart.x, coinStart.y);
    ctx.lineTo(coinEnd.x, coinEnd.y);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Arrowhead
    const arrAngle = Math.atan2(defDir.y, defDir.x);
    ctx.beginPath();
    ctx.moveTo(coinEnd.x, coinEnd.y);
    ctx.lineTo(
      coinEnd.x - Math.cos(arrAngle - Math.PI / 6) * 10,
      coinEnd.y - Math.sin(arrAngle - Math.PI / 6) * 10
    );
    ctx.lineTo(
      coinEnd.x - Math.cos(arrAngle + Math.PI / 6) * 10,
      coinEnd.y - Math.sin(arrAngle + Math.PI / 6) * 10
    );
    ctx.closePath();
    ctx.fillStyle = '#22C55E';
    ctx.fill();
  }

  ctx.restore();
}
