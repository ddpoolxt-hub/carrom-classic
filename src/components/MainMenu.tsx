/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode, AIDifficulty, GameSettings } from '../types/carrom';
import {
  Users,
  Bot,
  Compass,
  Play,
  Volume2,
  VolumeX,
  Music,
  BookOpen,
  Sparkles,
  Lock,
  Check,
  Palette,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { adMobService, CosmeticReward } from '../services/adMobService';

interface MainMenuProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onStartGame: (mode: GameMode) => void;
  onOpenTutorial: () => void;
  onOpenRewardedAd: (rewardType: CosmeticReward, title: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
  onOpenTutorial,
  onOpenRewardedAd,
}) => {
  const [selectedTab, setSelectedTab] = useState<'play' | 'skins'>('play');

  const strikerSkins: {
    id: GameSettings['strikerSkin'];
    name: string;
    color: string;
    isPremium?: boolean;
    rewardType?: CosmeticReward;
  }[] = [
    { id: 'classic_ivory', name: 'Classic Ivory', color: 'bg-amber-100' },
    { id: 'royal_ruby', name: 'Royal Ruby', color: 'bg-red-700' },
    {
      id: 'gold_champion',
      name: 'Gold Champion',
      color: 'bg-amber-500',
      isPremium: true,
      rewardType: 'gold_champion',
    },
    {
      id: 'neon_emerald',
      name: 'Neon Emerald',
      color: 'bg-emerald-500',
      isPremium: true,
      rewardType: 'neon_emerald',
    },
  ];

  const boardSkins: { id: GameSettings['boardSkin']; name: string; desc: string }[] = [
    { id: 'classic_sheesham', name: 'Classic Sheesham', desc: 'Warm polished Indian wood' },
    { id: 'vintage_teak', name: 'Vintage Teak', desc: 'Antique rich tournament wood' },
    { id: 'midnight_birch', name: 'Midnight Birch', desc: 'Modern high-contrast club board' },
  ];

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen flex flex-col justify-between py-4 px-3 select-none">
      {/* Top Header / App Brand */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-300 shadow-md flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-100">
            Carrom Classic
          </h1>
        </div>
        <p className="text-xs text-stone-400">
          The Authentic Indian Tabletop Board Game
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md my-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl mb-4 border border-stone-800/80">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              setSelectedTab('play');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selectedTab === 'play'
                ? 'bg-amber-400 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Play Game
          </button>
          <button
            onClick={() => {
              soundManager.playButtonSound();
              setSelectedTab('skins');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selectedTab === 'skins'
                ? 'bg-amber-400 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Equipment & Skins
          </button>
        </div>

        {selectedTab === 'play' ? (
          <div className="space-y-3">
            {/* Mode 1: Single Player vs AI */}
            <div className="p-3 bg-stone-800/70 border border-stone-700/60 rounded-xl hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">Vs Computer AI</h3>
                    <p className="text-[11px] text-stone-400">Play against intelligent bot</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playButtonSound();
                    onStartGame('vs_ai');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-stone-950" />
                  Play
                </button>
              </div>

              {/* AI Difficulty Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-700/40 text-xs">
                <span className="text-[11px] text-stone-400">Bot Difficulty:</span>
                <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
                  {(['easy', 'normal', 'hard'] as AIDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        soundManager.playButtonSound();
                        onUpdateSettings({ aiDifficulty: diff });
                      }}
                      className={`px-2 py-0.5 text-[11px] font-medium capitalize rounded transition-colors ${
                        settings.aiDifficulty === diff
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode 2: Two Player Pass & Play */}
            <div className="p-3 bg-stone-800/70 border border-stone-700/60 rounded-xl hover:border-amber-500/40 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">2-Player Pass & Play</h3>
                  <p className="text-[11px] text-stone-400">Play with friend on same device</p>
                </div>
              </div>

              <button
                onClick={() => {
                  soundManager.playButtonSound();
                  onStartGame('pass_and_play');
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-stone-950" />
                Play
              </button>
            </div>

            {/* Mode 3: Practice Board */}
            <div className="p-3 bg-stone-800/70 border border-stone-700/60 rounded-xl hover:border-amber-500/40 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">Practice & Trick Shots</h3>
                  <p className="text-[11px] text-stone-400">Free board to practice angle cuts</p>
                </div>
              </div>

              <button
                onClick={() => {
                  soundManager.playButtonSound();
                  onStartGame('practice');
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold text-xs rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Practice
              </button>
            </div>

            {/* How to Play Button */}
            <button
              onClick={() => {
                soundManager.playButtonSound();
                onOpenTutorial();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-stone-800/90 hover:bg-stone-750 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700/60 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              How to Play & Rules Guide
            </button>
          </div>
        ) : (
          /* Equipment & Skins Tab */
          <div className="space-y-4">
            {/* Striker Skin Selector */}
            <div>
              <div className="text-xs font-bold text-stone-200 mb-2">
                Striker Equipment
              </div>
              <div className="grid grid-cols-2 gap-2">
                {strikerSkins.map((skin) => {
                  const isUnlocked = adMobService.isCosmeticUnlocked(skin.id);
                  const isSelected = settings.strikerSkin === skin.id;

                  return (
                    <div
                      key={skin.id}
                      className={`p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60'
                          : 'bg-stone-800/80 border-stone-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full border border-stone-600 shadow-sm ${skin.color}`} />
                        {isSelected ? (
                          <span className="p-0.5 bg-amber-400 rounded-full text-stone-950">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : !isUnlocked ? (
                          <Lock className="w-3.5 h-3.5 text-stone-500" />
                        ) : null}
                      </div>

                      <div className="font-semibold text-stone-200 text-[11px] mb-1.5">
                        {skin.name}
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => {
                            soundManager.playButtonSound();
                            onUpdateSettings({ strikerSkin: skin.id });
                          }}
                          disabled={isSelected}
                          className="w-full py-1 text-[11px] font-medium bg-stone-700 hover:bg-stone-600 disabled:bg-amber-400/20 disabled:text-amber-300 rounded text-stone-200 transition-colors"
                        >
                          {isSelected ? 'Equipped' : 'Select'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playButtonSound();
                            if (skin.rewardType) {
                              onOpenRewardedAd(skin.rewardType, skin.name);
                            }
                          }}
                          className="w-full py-1 text-[10px] font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 rounded flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                          Watch to Unlock
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Board Wood Finishes */}
            <div>
              <div className="text-xs font-bold text-stone-200 mb-2">
                Board Wood Finishes
              </div>
              <div className="space-y-1.5">
                {boardSkins.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => {
                      soundManager.playButtonSound();
                      onUpdateSettings({ boardSkin: board.id });
                    }}
                    className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      settings.boardSkin === board.id
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                        : 'bg-stone-800/50 border-stone-700/50 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{board.name}</div>
                      <div className="text-[10px] text-stone-400">{board.desc}</div>
                    </div>
                    {settings.boardSkin === board.id && (
                      <Check className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Global Sound Toggles Bar */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              soundManager.playButtonSound();
              const next = !settings.soundEnabled;
              soundManager.setSoundEnabled(next);
              onUpdateSettings({ soundEnabled: next });
            }}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 transition-colors"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>SFX: {settings.soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonSound();
              const next = !settings.musicEnabled;
              soundManager.setMusicEnabled(next);
              onUpdateSettings({ musicEnabled: next });
            }}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <Music className="w-4 h-4 text-amber-400" />
            <span>Music: {settings.musicEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Reserved Area for Banner Advertisement (Monetization Preparation) */}
      <div className="w-full mt-3 pt-2 border-t border-stone-800/80">
        <div className="w-full h-[52px] bg-stone-900 border border-stone-800 rounded-lg flex flex-col items-center justify-center text-center px-2 shadow-inner">
          <div className="text-[9px] uppercase font-mono tracking-widest text-amber-500/80">
            Google AdMob · Banner Area (320x50 Reserved)
          </div>
          <div className="text-[11px] text-stone-400 font-sans">
            Carrom Pro Tournament 2026 · Ready for Native AdMob SDK
          </div>
        </div>
      </div>
    </div>
  );
};
