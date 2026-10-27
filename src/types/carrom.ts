/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PieceType = 'white' | 'black' | 'queen' | 'striker';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  highlightColor: string;
  isPocketed: boolean;
  pocketScale: number;
  pocketAlpha: number;
  isSinking: boolean;
  sinkTarget?: Vector2D;
}

export type GameMode = 'vs_ai' | 'pass_and_play' | 'practice';
export type AIDifficulty = 'easy' | 'normal' | 'hard';

export type GameState = 
  | 'MENU' 
  | 'PLAYING' 
  | 'PAUSED' 
  | 'AIMING' 
  | 'MOVING' 
  | 'ROUND_RESOLVING' 
  | 'GAME_OVER';

export interface Player {
  id: 'player1' | 'player2';
  name: string;
  isAI: boolean;
  score: number;
  assignedType: 'white' | 'black' | null;
  fouls: number;
  coinsPocketed: {
    white: number;
    black: number;
    queen: number;
  };
}

export interface GameSettings {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  powderFriction: 'low' | 'normal' | 'slick';
  soundEnabled: boolean;
  musicEnabled: boolean;
  boardSkin: 'classic_sheesham' | 'vintage_teak' | 'midnight_birch';
  strikerSkin: 'classic_ivory' | 'royal_ruby' | 'gold_champion' | 'neon_emerald';
  aimAssist: boolean;
}

export interface StrikerPlacement {
  baselineY: number;
  minX: number;
  maxX: number;
  currentX: number;
}

export interface ShotResult {
  pocketedThisTurn: Piece[];
  strikerPocketed: boolean;
  queenPocketed: boolean;
  firstHitPieceType: PieceType | null;
}

export interface QueenStatus {
  isPocketed: boolean;
  pocketedBy: 'player1' | 'player2' | null;
  needsCover: boolean;
  isCovered: boolean;
}

export interface GameStats {
  turnCount: number;
  totalHits: number;
  queenClaimedBy: string | null;
  durationSeconds: number;
}
