/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, QueenStatus } from '../types/carrom';
import { Volume2, VolumeX, Pause, RotateCcw, Home, Crown, AlertTriangle } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TopBarHUDProps {
  player1: Player;
  player2: Player;
  currentTurn: 'player1' | 'player2';
  queenStatus: QueenStatus;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const TopBarHUD: React.FC<TopBarHUDProps> = ({
  player1,
  player2,
  currentTurn,
  queenStatus,
  soundEnabled,
  onToggleSound,
  onPause,
  onRestart,
  onHome,
}) => {
  return (
    <div className="w-full max-w-[460px] mx-auto mb-1.5 px-3 py-2 bg-stone-900/90 border border-stone-800 rounded-xl shadow-md backdrop-blur-sm">
      {/* Upper Row: Navigation & Utility Actions */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              onHome();
            }}
            aria-label="Home"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title="Main Menu"
          >
            <Home className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-stone-200">
            Carrom Classic
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              onToggleSound();
            }}
            aria-label="Toggle Sound"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onRestart();
            }}
            aria-label="Restart Match"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title="Restart Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onPause();
            }}
            aria-label="Pause Game"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title="Pause Game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lower Row: Match Scores & Queen Indicator */}
      <div className="grid grid-cols-3 items-center pt-1.5 text-xs">
        {/* Player 1 Score Block */}
        <div
          className={`flex flex-col items-start px-2 py-1 rounded transition-colors ${
            currentTurn === 'player1'
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'opacity-70'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-medium text-stone-300">
            <span className="w-2 h-2 rounded-full bg-stone-100 border border-stone-500" />
            <span className="truncate max-w-[80px]">{player1.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-bold text-stone-100 tabular-nums">
              {player1.score}
            </span>
            {player1.fouls > 0 && (
              <span className="text-[10px] text-rose-400 flex items-center gap-0.5" title="Fouls">
                <AlertTriangle className="w-2.5 h-2.5" />
                {player1.fouls}
              </span>
            )}
          </div>
        </div>

        {/* Center: Queen Status Pill */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-[11px] font-medium">
            <Crown
              className={`w-3.5 h-3.5 ${
                queenStatus.isCovered
                  ? 'text-amber-400 fill-amber-400'
                  : queenStatus.isPocketed
                  ? 'text-rose-400 animate-pulse'
                  : 'text-stone-400'
              }`}
            />
            <span
              className={
                queenStatus.isCovered
                  ? 'text-amber-300 font-semibold'
                  : queenStatus.isPocketed
                  ? 'text-rose-400'
                  : 'text-stone-400'
              }
            >
              {queenStatus.isCovered
                ? 'Covered'
                : queenStatus.isPocketed
                ? 'Needs Cover'
                : 'Queen: Board'}
            </span>
          </div>
          <span className="text-[10px] text-stone-400 tabular-nums">
            {queenStatus.pocketedBy === 'player1'
              ? `${player1.name}'s shot`
              : queenStatus.pocketedBy === 'player2'
              ? `${player2.name}'s shot`
              : '3 pts bonus'}
          </span>
        </div>

        {/* Player 2 Score Block */}
        <div
          className={`flex flex-col items-end px-2 py-1 rounded transition-colors ${
            currentTurn === 'player2'
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'opacity-70'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-medium text-stone-300">
            <span className="truncate max-w-[80px]">{player2.name}</span>
            <span className="w-2 h-2 rounded-full bg-stone-900 border border-stone-600" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {player2.fouls > 0 && (
              <span className="text-[10px] text-rose-400 flex items-center gap-0.5" title="Fouls">
                <AlertTriangle className="w-2.5 h-2.5" />
                {player2.fouls}
              </span>
            )}
            <span className="text-base font-bold text-stone-100 tabular-nums">
              {player2.score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
