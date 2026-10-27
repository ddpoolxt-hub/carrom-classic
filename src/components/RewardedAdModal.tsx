/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, X } from 'lucide-react';
import { adMobService, CosmeticReward } from '../services/adMobService';
import { soundManager } from '../audio/soundManager';

interface RewardedAdModalProps {
  isOpen: boolean;
  rewardType: CosmeticReward;
  rewardTitle: string;
  onClose: () => void;
  onRewardClaimed: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  rewardType,
  rewardTitle,
  onClose,
  onRewardClaimed,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(5);
      setIsCompleted(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = () => {
    soundManager.playQueenChime();
    adMobService.grantReward(rewardType);
    onRewardClaimed();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-stone-100 text-center">
        {/* Dismiss if completed or voluntary cancel */}
        <button
          onClick={() => {
            soundManager.playButtonSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
          <Sparkles className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-stone-100 tracking-tight mb-1">
          {isCompleted ? 'Reward Ready!' : 'Sponsored Video'}
        </h3>
        <p className="text-xs text-stone-400 mb-5">
          {isCompleted
            ? `You have unlocked the ${rewardTitle} cosmetic!`
            : `Watch for ${secondsRemaining}s to unlock ${rewardTitle}`}
        </p>

        {/* AdMob Video Box Container */}
        <div className="relative aspect-video w-full rounded-xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center p-4 mb-5 overflow-hidden">
          {/* Subtle animated background bar */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/20 via-stone-900/40 to-stone-950" />

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 mb-1">
              Google AdMob · Rewarded Video Placement
            </span>
            <div className="text-xs text-stone-300 font-medium text-center">
              Carrom Classic Premium Equipment
            </div>
            {!isCompleted ? (
              <div className="mt-3 px-3 py-1 bg-stone-800/90 rounded-full border border-stone-700 text-xs font-mono text-amber-400">
                Reward in {secondsRemaining}s
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {isCompleted ? (
          <button
            onClick={handleClaim}
            className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl transition-colors shadow-lg"
          >
            Claim {rewardTitle}
          </button>
        ) : (
          <div className="text-[11px] text-stone-500 py-2 font-mono">
            Please watch to the end to claim your reward
          </div>
        )}
      </div>
    </div>
  );
};
