/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  GameState,
  Piece,
  Player,
  QueenStatus,
  GameSettings,
} from './types/carrom';
import {
  BASELINE_BOTTOM_Y,
  BASELINE_TOP_Y,
  FRICTION_RATES,
  createInitialPieces,
  createStriker,
  findSafeBaselineX,
  isStrikerPlacementValid,
  updatePhysics,
} from './physics/carromPhysics';
import { computeAIShot } from './ai/carromAI';
import { soundManager } from './audio/soundManager';
import { CosmeticReward } from './services/adMobService';
import { CarromCanvas } from './components/CarromCanvas';
import { StrikerControls } from './components/StrikerControls';
import { TopBarHUD } from './components/TopBarHUD';
import { MainMenu } from './components/MainMenu';
import { TutorialModal } from './components/TutorialModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { RewardedAdModal } from './components/RewardedAdModal';

export default function App() {
  // App & Game State
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentTurn, setCurrentTurn] = useState<'player1' | 'player2'>('player1');

  // Game Settings
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'vs_ai',
    aiDifficulty: 'normal',
    powderFriction: 'normal',
    soundEnabled: true,
    musicEnabled: false,
    boardSkin: 'classic_sheesham',
    strikerSkin: 'classic_ivory',
    aimAssist: true,
  });

  // Players
  const [player1, setPlayer1] = useState<Player>({
    id: 'player1',
    name: 'Player 1',
    isAI: false,
    score: 0,
    assignedType: 'white',
    fouls: 0,
    coinsPocketed: { white: 0, black: 0, queen: 0 },
  });

  const [player2, setPlayer2] = useState<Player>({
    id: 'player2',
    name: 'Computer Bot',
    isAI: true,
    score: 0,
    assignedType: 'black',
    fouls: 0,
    coinsPocketed: { white: 0, black: 0, queen: 0 },
  });

  // Board pieces and striker
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [striker, setStriker] = useState<Piece>(() => createStriker(400, BASELINE_BOTTOM_Y, 'classic_ivory'));
  const [strikerPlacementX, setStrikerPlacementX] = useState<number>(400);

  // Queen state & match stats
  const [queenStatus, setQueenStatus] = useState<QueenStatus>({
    isPocketed: false,
    pocketedBy: null,
    needsCover: false,
    isCovered: false,
  });
  const [turnsPlayed, setTurnsPlayed] = useState<number>(0);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);

  // Modals & Turn Tracking
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [rewardedModal, setRewardedModal] = useState<{
    isOpen: boolean;
    rewardType: CosmeticReward;
    title: string;
  }>({
    isOpen: false,
    rewardType: 'gold_champion',
    title: 'Gold Champion Striker',
  });

  // Turn evaluation tracking (within a shot)
  const shotTurnDataRef = useRef<{
    pocketedPieces: Piece[];
    strikerSunk: boolean;
    queenSunkThisShot: boolean;
  }>({
    pocketedPieces: [],
    strikerSunk: false,
    queenSunkThisShot: false,
  });

  // Physics animation loop ref
  const animFrameRef = useRef<number | null>(null);
  const isSimulatingRef = useRef<boolean>(false);

  // AI delay timer ref
  const aiTimerRef = useRef<number | null>(null);

  // Reset / Initialize Match
  const startNewGame = useCallback(
    (mode: GameMode = settings.mode) => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }

      const initialPieces = createInitialPieces();
      const initialStriker = createStriker(400, BASELINE_BOTTOM_Y, settings.strikerSkin);

      setPieces(initialPieces);
      setStriker(initialStriker);
      setStrikerPlacementX(400);
      setCurrentTurn('player1');
      setTurnsPlayed(0);
      setWinner(null);

      setQueenStatus({
        isPocketed: false,
        pocketedBy: null,
        needsCover: false,
        isCovered: false,
      });

      setPlayer1({
        id: 'player1',
        name: mode === 'pass_and_play' ? 'Player 1' : 'Player',
        isAI: false,
        score: 0,
        assignedType: 'white',
        fouls: 0,
        coinsPocketed: { white: 0, black: 0, queen: 0 },
      });

      setPlayer2({
        id: 'player2',
        name: mode === 'vs_ai' ? 'Computer Bot' : mode === 'practice' ? 'Practice' : 'Player 2',
        isAI: mode === 'vs_ai',
        score: 0,
        assignedType: mode === 'practice' ? null : 'black',
        fouls: 0,
        coinsPocketed: { white: 0, black: 0, queen: 0 },
      });

      setSettings((prev: GameSettings) => ({ ...prev, mode }));
      setGameState('PLAYING');
    },
    [settings.mode, settings.strikerSkin]
  );

  // Prepare striker placement for current turn
  const resetStrikerForTurn = useCallback(
    (turnPlayerId: 'player1' | 'player2') => {
      const baselineY = turnPlayerId === 'player1' ? BASELINE_BOTTOM_Y : BASELINE_TOP_Y;
      setPieces((currentPieces: Piece[]) => {
        const safeX = findSafeBaselineX(striker, currentPieces, 400, baselineY);
        setStrikerPlacementX(safeX);
        setStriker(createStriker(safeX, baselineY, settings.strikerSkin));
        return currentPieces;
      });
    },
    [settings.strikerSkin, striker]
  );

  // Update striker position along baseline
  const handleStrikerPositionChange = (newX: number) => {
    const baselineY = currentTurn === 'player1' ? BASELINE_BOTTOM_Y : BASELINE_TOP_Y;
    if (isStrikerPlacementValid(striker, pieces, newX, baselineY)) {
      setStrikerPlacementX(newX);
      setStriker((prev: Piece) => ({
        ...prev,
        x: newX,
        y: baselineY,
      }));
    }
  };

  // Launch Striker Shot
  const handleShoot = useCallback(
    (vx: number, vy: number, power: number) => {
      if (isSimulatingRef.current) return;

      soundManager.playStrikeLaunchSound(power / 100);

      shotTurnDataRef.current = {
        pocketedPieces: [],
        strikerSunk: false,
        queenSunkThisShot: false,
      };

      setStriker((prev: Piece) => ({
        ...prev,
        vx,
        vy,
      }));

      isSimulatingRef.current = true;
      setGameState('MOVING');
    },
    []
  );

  // AI Turn Trigger
  useEffect(() => {
    if (
      gameState === 'PLAYING' &&
      currentTurn === 'player2' &&
      player2.isAI &&
      !isSimulatingRef.current
    ) {
      aiTimerRef.current = window.setTimeout(() => {
        const decision = computeAIShot(
          striker,
          pieces,
          player2.assignedType,
          settings.aiDifficulty,
          BASELINE_TOP_Y
        );

        handleStrikerPositionChange(decision.baselineX);

        aiTimerRef.current = window.setTimeout(() => {
          const speed = 7 + (decision.power / 100) * 25;
          const vx = Math.cos(decision.aimAngle) * speed;
          const vy = Math.sin(decision.aimAngle) * speed;
          handleShoot(vx, vy, decision.power);
        }, 550);
      }, 700);

      return () => {
        if (aiTimerRef.current) {
          clearTimeout(aiTimerRef.current);
          aiTimerRef.current = null;
        }
      };
    }
  }, [
    gameState,
    currentTurn,
    player2.isAI,
    player2.assignedType,
    settings.aiDifficulty,
    striker,
    pieces,
    handleShoot,
  ]);

  // Main Physics Simulation Loop
  useEffect(() => {
    if (gameState !== 'MOVING') return;

    let localPieces = [...pieces, striker];
    const frictionRate = FRICTION_RATES[settings.powderFriction as 'low' | 'normal' | 'slick'];

    const runPhysicsTick = () => {
      const { hasMovement } = updatePhysics(
        localPieces,
        frictionRate,
        (intensity) => soundManager.playCollisionSound(intensity),
        (intensity) => soundManager.playCushionSound(intensity),
        (p) => {
          soundManager.playPocketSound(p.type === 'queen');
          if (p.type === 'striker') {
            shotTurnDataRef.current.strikerSunk = true;
          } else {
            shotTurnDataRef.current.pocketedPieces.push(p);
            if (p.type === 'queen') {
              shotTurnDataRef.current.queenSunkThisShot = true;
            }
          }
        }
      );

      const currentStriker = localPieces.find((p) => p.type === 'striker') || striker;
      const coinPieces = localPieces.filter((p) => p.type !== 'striker');

      setPieces([...coinPieces]);
      setStriker({ ...currentStriker });

      if (hasMovement) {
        animFrameRef.current = requestAnimationFrame(runPhysicsTick);
      } else {
        isSimulatingRef.current = false;
        resolveTurn();
      }
    };

    animFrameRef.current = requestAnimationFrame(runPhysicsTick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState, settings.powderFriction]);

  // Carrom Rule Resolution after a shot settles
  const resolveTurn = useCallback(() => {
    const { pocketedPieces, strikerSunk, queenSunkThisShot } = shotTurnDataRef.current;
    const activePlayer = currentTurn === 'player1' ? player1 : player2;

    let pointsEarned = 0;
    let whiteCount = 0;
    let blackCount = 0;
    let queenCount = 0;
    let legalPiecePocketed = false;
    let isFoul = false;

    // 1. Check Striker Foul
    if (strikerSunk) {
      isFoul = true;
      soundManager.playFoulSound();
    }

    // 2. Process Pocketed Coins
    pocketedPieces.forEach((p) => {
      if (p.type === 'white') {
        whiteCount++;
        pointsEarned += 10;
        if (activePlayer.assignedType === 'white' || !activePlayer.assignedType) {
          legalPiecePocketed = true;
        }
      } else if (p.type === 'black') {
        blackCount++;
        pointsEarned += 5;
        if (activePlayer.assignedType === 'black' || !activePlayer.assignedType) {
          legalPiecePocketed = true;
        }
      } else if (p.type === 'queen') {
        queenCount++;
        legalPiecePocketed = true;
      }
    });

    // 3. Queen Logic & Cover Rule
    let nextQueenStatus = { ...queenStatus };

    if (queenSunkThisShot) {
      nextQueenStatus = {
        isPocketed: true,
        pocketedBy: currentTurn,
        needsCover: true,
        isCovered: false,
      };

      const nonQueenCoins = pocketedPieces.filter((p) => p.type !== 'queen');
      if (nonQueenCoins.length > 0 && !isFoul) {
        nextQueenStatus.isCovered = true;
        nextQueenStatus.needsCover = false;
        pointsEarned += 25;
      }
    } else if (queenStatus.needsCover && queenStatus.pocketedBy === currentTurn) {
      if (legalPiecePocketed && !isFoul) {
        nextQueenStatus.isCovered = true;
        nextQueenStatus.needsCover = false;
        pointsEarned += 25;
      } else {
        nextQueenStatus = {
          isPocketed: false,
          pocketedBy: null,
          needsCover: false,
          isCovered: false,
        };
        setPieces((prev: Piece[]) =>
          prev.map((p) =>
            p.type === 'queen'
              ? {
                  ...p,
                  x: 400,
                  y: 400,
                  vx: 0,
                  vy: 0,
                  isPocketed: false,
                  isSinking: false,
                  pocketScale: 1.0,
                  pocketAlpha: 1.0,
                }
              : p
          )
        );
      }
    }

    setQueenStatus(nextQueenStatus);

    // 4. Update Player Scores & Stats
    const updatedActivePlayer = {
      ...activePlayer,
      score: Math.max(0, activePlayer.score + pointsEarned - (isFoul ? 5 : 0)),
      fouls: activePlayer.fouls + (isFoul ? 1 : 0),
      coinsPocketed: {
        white: activePlayer.coinsPocketed.white + whiteCount,
        black: activePlayer.coinsPocketed.black + blackCount,
        queen: activePlayer.coinsPocketed.queen + queenCount,
      },
    };

    if (currentTurn === 'player1') {
      setPlayer1(updatedActivePlayer);
    } else {
      setPlayer2(updatedActivePlayer);
    }

    setTurnsPlayed((t: number) => t + 1);

    // 5. Check Game Over Condition
    setPieces((currentPieces: Piece[]) => {
      const remainingCoins = currentPieces.filter((p) => !p.isPocketed && p.type !== 'striker');

      if (remainingCoins.length === 0) {
        const p1Score = currentTurn === 'player1' ? updatedActivePlayer.score : player1.score;
        const p2Score = currentTurn === 'player2' ? updatedActivePlayer.score : player2.score;

        if (p1Score > p2Score) {
          setWinner(player1);
        } else if (p2Score > p1Score) {
          setWinner(player2);
        } else {
          setWinner('draw');
        }
        setGameState('GAME_OVER');
        return currentPieces;
      }

      // 6. Turn Switch vs Extra Turn
      const getsExtraTurn = legalPiecePocketed && !isFoul;
      const nextTurnPlayerId = getsExtraTurn
        ? currentTurn
        : currentTurn === 'player1'
        ? 'player2'
        : 'player1';

      setCurrentTurn(nextTurnPlayerId);
      resetStrikerForTurn(nextTurnPlayerId);
      setGameState('PLAYING');

      return currentPieces;
    });
  }, [currentTurn, player1, player2, queenStatus, resetStrikerForTurn]);

  // Handle Home navigation
  const handleHome = () => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setGameState('MENU');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-2">
      {gameState === 'MENU' ? (
        <MainMenu
          settings={settings}
          onUpdateSettings={(newSettings) =>
            setSettings((prev: GameSettings) => ({ ...prev, ...newSettings }))
          }
          onStartGame={(mode) => startNewGame(mode)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          onOpenRewardedAd={(rewardType, title) =>
            setRewardedModal({ isOpen: true, rewardType, title })
          }
        />
      ) : (
        <div className="w-full max-w-[480px] flex flex-col items-center">
          {/* Top HUD with Scores, Turns & Game Controls */}
          <TopBarHUD
            player1={player1}
            player2={player2}
            currentTurn={currentTurn}
            queenStatus={queenStatus}
            soundEnabled={settings.soundEnabled}
            onToggleSound={() => {
              const next = !settings.soundEnabled;
              soundManager.setSoundEnabled(next);
              setSettings((s: GameSettings) => ({ ...s, soundEnabled: next }));
            }}
            onPause={() => setGameState('PAUSED')}
            onRestart={() => startNewGame()}
            onHome={handleHome}
          />

          {/* Interactive Carrom Canvas Board */}
          <CarromCanvas
            pieces={pieces}
            striker={striker}
            currentTurnPlayerId={currentTurn}
            isCurrentPlayerAI={currentTurn === 'player2' && player2.isAI}
            isAimingAllowed={gameState === 'PLAYING'}
            boardSkin={settings.boardSkin}
            onShoot={handleShoot}
            onStrikerPositionChange={handleStrikerPositionChange}
            strikerPlacementX={strikerPlacementX}
          />

          {/* Bottom Striker Baseline & Touch Slider Controls */}
          <StrikerControls
            currentX={strikerPlacementX}
            onPositionChange={handleStrikerPositionChange}
            disabled={gameState !== 'PLAYING'}
            isAIMove={currentTurn === 'player2' && player2.isAI}
            turnName={
              currentTurn === 'player1'
                ? `${player1.name}'s Turn`
                : `${player2.name}'s Turn`
            }
            assignedType={
              currentTurn === 'player1' ? player1.assignedType : player2.assignedType
            }
          />
        </div>
      )}

      {/* Tutorial Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Pause Menu Modal */}
      <PauseModal
        isOpen={gameState === 'PAUSED'}
        onResume={() => setGameState('PLAYING')}
        onRestart={() => startNewGame()}
        onHome={handleHome}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        soundEnabled={settings.soundEnabled}
        musicEnabled={settings.musicEnabled}
        onToggleSound={() => {
          const next = !settings.soundEnabled;
          soundManager.setSoundEnabled(next);
          setSettings((s: GameSettings) => ({ ...s, soundEnabled: next }));
        }}
        onToggleMusic={() => {
          const next = !settings.musicEnabled;
          soundManager.setMusicEnabled(next);
          setSettings((s: GameSettings) => ({ ...s, musicEnabled: next }));
        }}
        powderFriction={settings.powderFriction}
        onChangePowder={(p) => setSettings((s: GameSettings) => ({ ...s, powderFriction: p }))}
      />

      {/* Game Over / Victory Screen */}
      {gameState === 'GAME_OVER' && winner && (
        <GameOverModal
          winner={winner}
          player1={player1}
          player2={player2}
          queenStatus={queenStatus}
          turnsPlayed={turnsPlayed}
          onRestart={() => startNewGame()}
          onHome={handleHome}
        />
      )}

      {/* Rewarded Ad Cosmetic Modal */}
      <RewardedAdModal
        isOpen={rewardedModal.isOpen}
        rewardType={rewardedModal.rewardType}
        rewardTitle={rewardedModal.title}
        onClose={() =>
          setRewardedModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRewardClaimed={() => {
          if (rewardedModal.rewardType === 'gold_champion') {
            setSettings((s: GameSettings) => ({ ...s, strikerSkin: 'gold_champion' }));
          } else if (rewardedModal.rewardType === 'neon_emerald') {
            setSettings((s: GameSettings) => ({ ...s, strikerSkin: 'neon_emerald' }));
          }
        }}
      />
    </div>
  );
}
