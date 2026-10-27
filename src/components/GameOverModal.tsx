/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Player, QueenStatus } from '../types/carrom';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

function triggerConfetti() {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    return;
  }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);
  const colors = ['#F59E0B', '#DC2626', '#FFFFFF', '#10B981', '#FCD34D'];
  const particles = Array.from({ length: 70 }, () => ({
    x: width * 0.5 + (Math.random() - 0.5) * 60,
    y: height * 0.55,
    vx: (Math.random() - 0.5) * 16,
    vy: -8 - Math.random() * 10,
    size: 5 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    alpha: 1,
  }));

  const animate = () => {
    ctx.clearRect(0, 0, width, height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.vx *= 0.98;
      p.rot += p.rotSpeed;
      p.alpha = Math.max(0, p.alpha - 0.012);
      if (p.alpha > 0.02) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    if (alive) {
      requestAnimationFrame(animate);
    } else if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };
  requestAnimationFrame(animate);
}

interface GameOverModalProps {
  winner: Player | 'draw';
  player1: Player;
  player2: Player;
  queenStatus: QueenStatus;
  turnsPlayed: number;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  player1,
  player2,
  queenStatus,
  turnsPlayed,
  onRestart,
  onHome,
}) => {
  useEffect(() => {
    soundManager.playVictoryFanfare();
    triggerConfetti();
  }, []);

  const isPlayer1Winner = winner !== 'draw' && winner.id === 'player1';
  const isDraw = winner === 'draw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-stone-100 text-center">
        {/* Trophy / Result Badge */}
        <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-1 text-stone-100">
          {isDraw ? 'Match Drawn!' : `${winner.name} Wins!`}
        </h2>
        <p className="text-xs text-stone-400 mb-5">
          {isDraw
            ? 'Both players finished with equal points'
            : isPlayer1Winner
            ? 'Brilliant board control and pocket accuracy!'
            : 'Well played match! Ready for a rematch?'}
        </p>

        {/* Scorecard Table */}
        <div className="bg-stone-800/80 border border-stone-700/60 rounded-xl p-3 mb-5 text-left text-xs">
          <div className="grid grid-cols-3 text-stone-400 pb-2 border-b border-stone-700 text-[11px] font-medium">
            <span>Player</span>
            <span className="text-center">Coins</span>
            <span className="text-right">Score</span>
          </div>

          {/* Player 1 Row */}
          <div className="grid grid-cols-3 items-center py-2 border-b border-stone-700/50">
            <span className="font-semibold text-stone-200 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-100 border border-stone-400" />
              {player1.name}
            </span>
            <span className="text-center font-mono tabular-nums text-stone-300">
              {player1.coinsPocketed.white + player1.coinsPocketed.black + player1.coinsPocketed.queen}
            </span>
            <span className="text-right font-bold font-mono tabular-nums text-amber-400">
              {player1.score}
            </span>
          </div>

          {/* Player 2 Row */}
          <div className="grid grid-cols-3 items-center py-2">
            <span className="font-semibold text-stone-200 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-900 border border-stone-600" />
              {player2.name}
            </span>
            <span className="text-center font-mono tabular-nums text-stone-300">
              {player2.coinsPocketed.white + player2.coinsPocketed.black + player2.coinsPocketed.queen}
            </span>
            <span className="text-right font-bold font-mono tabular-nums text-amber-400">
              {player2.score}
            </span>
          </div>
        </div>

        {/* Match Stats summary */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-[11px] text-stone-400">
          <div className="p-2 bg-stone-800/40 rounded-lg border border-stone-800">
            <div className="text-stone-300 font-medium font-mono tabular-nums">{turnsPlayed}</div>
            <div>Turns</div>
          </div>
          <div className="p-2 bg-stone-800/40 rounded-lg border border-stone-800">
            <div className="text-stone-300 font-medium truncate">
              {queenStatus.isCovered ? (queenStatus.pocketedBy === 'player1' ? player1.name : player2.name) : 'None'}
            </div>
            <div>Queen</div>
          </div>
          <div className="p-2 bg-stone-800/40 rounded-lg border border-stone-800">
            <div className="text-stone-300 font-medium font-mono tabular-nums">
              {player1.fouls + player2.fouls}
            </div>
            <div>Fouls</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold rounded-xl transition-colors shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onHome();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl border border-stone-700/60 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
