/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Music, BookOpen, Home, Sparkles } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenTutorial: () => void;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  powderFriction: 'low' | 'normal' | 'slick';
  onChangePowder: (p: 'low' | 'normal' | 'slick') => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onHome,
  onOpenTutorial,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  powderFriction,
  onChangePowder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-stone-100">
        <h2 className="text-xl font-bold text-center tracking-tight mb-5">
          Game Paused
        </h2>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold rounded-xl transition-colors shadow-md"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            Resume Game
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl border border-stone-700/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Match
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onOpenTutorial();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl border border-stone-700/60 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            How to Play
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              onHome();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl border border-stone-700/60 transition-colors"
          >
            <Home className="w-4 h-4" />
            Exit to Home
          </button>
        </div>

        {/* Quick Settings Section */}
        <div className="mt-5 pt-4 border-t border-stone-800 space-y-3">
          <div className="text-xs font-semibold text-stone-400">Settings</div>

          {/* Sound & Music Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playButtonSound();
                onToggleSound();
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                soundEnabled
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>SFX: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playButtonSound();
                onToggleMusic();
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                musicEnabled
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Music: {musicEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Borax Powder Friction Level */}
          <div>
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Borax Powder Friction
              </span>
              <span className="capitalize text-stone-300 font-mono text-[11px]">{powderFriction}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-stone-800 rounded-lg">
              {(['low', 'normal', 'slick'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    soundManager.playButtonSound();
                    onChangePowder(level);
                  }}
                  className={`py-1 text-xs capitalize rounded font-medium transition-colors ${
                    powderFriction === level
                      ? 'bg-amber-400 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
