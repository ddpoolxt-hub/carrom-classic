/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BASELINE_MAX_X, BASELINE_MIN_X } from '../physics/carromPhysics';
import { Crosshair, ArrowLeftRight } from 'lucide-react';

interface StrikerControlsProps {
  currentX: number;
  onPositionChange: (newX: number) => void;
  disabled: boolean;
  isAIMove: boolean;
  turnName: string;
  assignedType: 'white' | 'black' | null;
}

export const StrikerControls: React.FC<StrikerControlsProps> = ({
  currentX,
  onPositionChange,
  disabled,
  isAIMove,
  turnName,
  assignedType,
}) => {
  return (
    <div className="w-full max-w-[460px] mx-auto mt-2 px-3 py-2 bg-stone-900/95 border border-stone-800 rounded-xl shadow-lg backdrop-blur-sm">
      {/* Turn Banner & Prompt */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full border border-stone-600 ${
              assignedType === 'white'
                ? 'bg-stone-100'
                : assignedType === 'black'
                ? 'bg-stone-900'
                : 'bg-amber-500'
            }`}
          />
          <span className="text-stone-200">{turnName}</span>
          {isAIMove && (
            <span className="text-[10px] text-amber-400 font-mono tracking-tight animate-pulse">
              thinking...
            </span>
          )}
        </div>
        <div className="text-[11px] text-stone-400 flex items-center gap-1">
          <Crosshair className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Drag board to aim & strike</span>
        </div>
      </div>

      {/* Baseline Striker Slider */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] text-stone-400 shrink-0 font-medium">
          <ArrowLeftRight className="w-3.5 h-3.5 text-stone-400" />
          <span>Position</span>
        </div>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={BASELINE_MIN_X}
            max={BASELINE_MAX_X}
            step={1}
            value={currentX}
            disabled={disabled || isAIMove}
            onChange={(e) => onPositionChange(Number(e.target.value))}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
          />
        </div>

        {/* Quick center reset button */}
        <button
          onClick={() => onPositionChange(400)}
          disabled={disabled || isAIMove}
          title="Center Striker"
          className="px-2 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 rounded border border-stone-700/60 transition-colors shrink-0"
        >
          Center
        </button>
      </div>
    </div>
  );
};
