/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Target, ShieldAlert, Crown, CircleDot } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to Carrom Classic',
      icon: <Target className="w-8 h-8 text-amber-400" />,
      content: (
        <div className="space-y-3 text-sm text-stone-300">
          <p>
            Carrom is an ancient Indian tabletop board game of precision and angle calculation. The objective is to pocket your assigned coins into any of the four corner pockets using the <strong>Striker</strong>.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
            <div className="p-2.5 bg-stone-800/80 rounded-lg border border-stone-700/60">
              <div className="w-5 h-5 mx-auto rounded-full bg-stone-100 border border-stone-400 mb-1" />
              <div className="font-semibold text-stone-100">White Coin</div>
              <div className="text-stone-400">10 Points</div>
            </div>
            <div className="p-2.5 bg-stone-800/80 rounded-lg border border-stone-700/60">
              <div className="w-5 h-5 mx-auto rounded-full bg-stone-900 border border-stone-600 mb-1" />
              <div className="font-semibold text-stone-100">Black Coin</div>
              <div className="text-stone-400">5 Points</div>
            </div>
            <div className="p-2.5 bg-stone-800/80 rounded-lg border border-stone-700/60">
              <div className="w-5 h-5 mx-auto rounded-full bg-rose-600 border border-rose-400 mb-1" />
              <div className="font-semibold text-stone-100">Red Queen</div>
              <div className="text-stone-400">25 Points</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Striker Placement & Aiming',
      icon: <CircleDot className="w-8 h-8 text-amber-400" />,
      content: (
        <div className="space-y-3 text-sm text-stone-300">
          <p>
            <strong>1. Position Striker:</strong> Slide the striker along your baseline using the bottom slider or by touching and dragging the striker on the board.
          </p>
          <p>
            <strong>2. Aim & Adjust Force:</strong> Touch the board and drag in your desired shot direction. A dotted trajectory guide with collision prediction will show where the coin will travel!
          </p>
          <p>
            <strong>3. Release to Shoot:</strong> Lift your finger to release the striker. Power is proportional to how far you drag back.
          </p>
          <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs text-amber-200">
            <strong>Pro Tip:</strong> Pocketing one of your own coins earns you an immediate <em>extra turn</em>!
          </div>
        </div>
      ),
    },
    {
      title: 'The Queen & The Cover Rule',
      icon: <Crown className="w-8 h-8 text-rose-400" />,
      content: (
        <div className="space-y-3 text-sm text-stone-300">
          <p>
            The Red Queen is the most valuable piece on the board (25 points).
          </p>
          <p>
            <strong>Covering the Queen:</strong> After pocketing the Queen, you must pocket any other coin on the <em>same shot</em> or on your <em>immediate next turn</em> to successfully cover her.
          </p>
          <p>
            If you fail to pocket another coin on your next turn, the Queen returns to the center circle of the board!
          </p>
        </div>
      ),
    },
    {
      title: 'Fouls & Penalties',
      icon: <ShieldAlert className="w-8 h-8 text-rose-500" />,
      content: (
        <div className="space-y-3 text-sm text-stone-300">
          <p>
            <strong>Striker Foul:</strong> If your striker falls into any corner pocket, a foul is called:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-xs text-stone-400">
            <li>You lose your turn immediately.</li>
            <li>One of your previously pocketed coins is returned to the center circle as a penalty.</li>
          </ul>
          <p className="pt-1 text-xs text-stone-300">
            <strong>Victory:</strong> Pocket all your assigned pieces and bank the Queen with the highest score to achieve Carrom mastery!
          </p>
        </div>
      ),
    },
  ];

  const currentSlide = slides[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playButtonSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-stone-800 rounded-xl border border-stone-700/60">
            {currentSlide.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-100 tracking-tight">
              {currentSlide.title}
            </h2>
            <p className="text-xs text-stone-400">
              Step {step + 1} of {slides.length}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="min-h-[190px] py-2">{currentSlide.content}</div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-stone-800">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'w-4 bg-amber-400' : 'bg-stone-700'
                }`}
              />
            ))}
          </div>

          {step < slides.length - 1 ? (
            <button
              onClick={() => {
                soundManager.playButtonSound();
                setStep((s) => s + 1);
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                soundManager.playButtonSound();
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-md"
            >
              Got It, Play!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
