import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Pause,
  Sparkles,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Timer,
  Infinity as InfinityIcon,
  Trophy,
  Zap,
  Clock,
  Flame,
} from 'lucide-react';
import {
  Direction,
  FoodItem,
  GameStatus,
  Particle,
  Point,
  Difficulty,
  GameStats,
  GameMode,
  GameOverReason,
} from '../types';
import { synthEngine } from '../audio/synthEngine';

interface SnakeGameProps {
  onScoreUpdate: (stats: GameStats) => void;
  accentColor: string;
}

const GRID_SIZE = 22; // 22 x 22 tiles
const SPEED_CONFIG: Record<Difficulty, number> = {
  casual: 120, // ms per tick
  normal: 90,
  overdrive: 65,
};

const ONE_MIN_DURATION = 60; // 60 seconds

export const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreUpdate, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [status, setStatus] = useState<GameStatus>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('1min');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState(0);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('collision');

  // Time remaining state for 1-min blitz (in seconds with 1 decimal)
  const [timeLeft, setTimeLeft] = useState<number>(ONE_MIN_DURATION);

  // High score tracking
  const [oneMinHighScore, setOneMinHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('neon_snake_1min_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('neon_snake_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [fruitsEaten, setFruitsEaten] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [lastEatTime, setLastEatTime] = useState(0);

  // Game Engine State Refs
  const snakeRef = useRef<Point[]>([
    { x: 11, y: 11 },
    { x: 10, y: 11 },
    { x: 9, y: 11 },
  ]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<FoodItem>({
    x: 16,
    y: 11,
    type: 'standard',
    points: 100,
    createdAt: Date.now(),
  });
  const bonusFoodRef = useRef<FoodItem | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTickTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>('idle');
  const comboRef = useRef(1);
  const timeRemainingRef = useRef<number>(ONE_MIN_DURATION);
  const gameModeRef = useRef<GameMode>('1min');
  const lastSecondTickRef = useRef<number>(60);

  // Sync refs
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  // Push score & timer updates up
  useEffect(() => {
    onScoreUpdate({
      score,
      highScore,
      oneMinHighScore,
      fruitsEaten,
      combo,
      maxCombo,
      timeRemaining: Math.max(0, timeLeft),
      gameMode,
      status,
      gameOverReason,
    });
  }, [score, highScore, oneMinHighScore, fruitsEaten, combo, maxCombo, timeLeft, gameMode, status, gameOverReason, onScoreUpdate]);

  // Spawn explosion / burst particles
  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tileSize = canvas.width / GRID_SIZE;
    const centerX = (x + 0.5) * tileSize;
    const centerY = (y + 0.5) * tileSize;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 3 + 1.5;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.floor(Math.random() * 20 + 20),
      });
    }
  };

  // Celebration fireworks when 60s timer expires successfully
  const spawnCelebration = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = ['#39FF14', '#00FFFF', '#FF00FF', '#FFFFFF', '#FFD700'];

    for (let p = 0; p < 60; p++) {
      const randX = Math.random() * canvas.width;
      const randY = Math.random() * (canvas.height * 0.7);
      const color = colors[Math.floor(Math.random() * colors.length)];
      particlesRef.current.push({
        x: randX,
        y: randY,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 1.5,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.floor(Math.random() * 35 + 25),
      });
    }
  };

  // Generate food safely
  const generateNewFood = useCallback((): FoodItem => {
    const snake = snakeRef.current;
    let newX = 0;
    let newY = 0;
    let occupied = true;

    while (occupied) {
      newX = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      newY = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      occupied = snake.some((seg) => seg.x === newX && seg.y === newY);
    }

    return {
      x: newX,
      y: newY,
      type: 'standard',
      points: 100,
      createdAt: Date.now(),
    };
  }, []);

  // Spawn bonus food periodically
  const maybeSpawnBonusFood = useCallback(() => {
    if (bonusFoodRef.current) return;
    if (Math.random() > 0.6) return; // 40% chance

    const snake = snakeRef.current;
    let newX = 0;
    let newY = 0;
    let occupied = true;

    while (occupied) {
      newX = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      newY = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      occupied =
        snake.some((seg) => seg.x === newX && seg.y === newY) ||
        (foodRef.current.x === newX && foodRef.current.y === newY);
    }

    bonusFoodRef.current = {
      x: newX,
      y: newY,
      type: 'bonus',
      points: 300,
      createdAt: Date.now(),
    };
  }, []);

  // Handle Game Over (either collision or time-up)
  const handleGameOver = useCallback((reason: GameOverReason) => {
    setStatus('game-over');
    setGameOverReason(reason);

    if (reason === 'time-up') {
      synthEngine.playTimeUpSound();
      spawnCelebration();
    } else {
      synthEngine.playGameOverSound();
      // Disintegration particles on snake segments
      snakeRef.current.forEach((seg) => {
        spawnParticles(seg.x, seg.y, '#f43f5e', 4);
      });
    }

    // High score recording based on mode
    if (gameModeRef.current === '1min') {
      setOneMinHighScore((prev) => {
        if (score > prev) {
          localStorage.setItem('neon_snake_1min_highscore', score.toString());
          return score;
        }
        return prev;
      });
    } else {
      setHighScore((prev) => {
        if (score > prev) {
          localStorage.setItem('neon_snake_highscore', score.toString());
          return score;
        }
        return prev;
      });
    }
  }, [score]);

  // Main snake motion game tick
  const updateGameLogic = useCallback(() => {
    if (statusRef.current !== 'playing') return;

    directionRef.current = nextDirectionRef.current;
    const dir = directionRef.current;
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    if (dir === 'UP') head.y -= 1;
    if (dir === 'DOWN') head.y += 1;
    if (dir === 'LEFT') head.x -= 1;
    if (dir === 'RIGHT') head.x += 1;

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      handleGameOver('collision');
      return;
    }

    // Self collision
    if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      handleGameOver('collision');
      return;
    }

    snake.unshift(head);

    let ate = false;
    const now = Date.now();

    // Standard food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      ate = true;
      synthEngine.playFruitSound(false);
      spawnParticles(head.x, head.y, '#FF00FF', 14);

      // Fast combo multiplier (under 3.5s = combo boost)
      let currentC = comboRef.current;
      if (now - lastEatTime < 3500 && lastEatTime > 0) {
        currentC = Math.min(5, currentC + 1);
      } else {
        currentC = 1;
      }
      comboRef.current = currentC;
      setCombo(currentC);
      setMaxCombo((prev) => Math.max(prev, currentC));
      setLastEatTime(now);

      const addedScore = 100 * currentC;
      setScore((s) => s + addedScore);
      setFruitsEaten((f) => f + 1);

      foodRef.current = generateNewFood();
      maybeSpawnBonusFood();
    }

    // Bonus food collision
    if (bonusFoodRef.current && head.x === bonusFoodRef.current.x && head.y === bonusFoodRef.current.y) {
      ate = true;
      synthEngine.playFruitSound(true);
      spawnParticles(head.x, head.y, '#00FFFF', 20);

      const bonusPts = 300 * comboRef.current;
      setScore((s) => s + bonusPts);
      setFruitsEaten((f) => f + 1);
      bonusFoodRef.current = null;
    }

    // Expire bonus food after 7s
    if (bonusFoodRef.current && now - bonusFoodRef.current.createdAt > 7000) {
      bonusFoodRef.current = null;
    }

    if (!ate) {
      snake.pop();
    }

    snakeRef.current = snake;
  }, [generateNewFood, handleGameOver, lastEatTime, maybeSpawnBonusFood]);

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && status === 'playing') {
        setStatus('paused');
        return;
      }
      if (e.key === ' ' && status === 'paused') {
        setStatus('playing');
        return;
      }
      if (e.key === ' ' && (status === 'idle' || status === 'game-over')) {
        startGame();
        return;
      }

      if (status !== 'playing') return;

      const currentDir = directionRef.current;

      if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && currentDir !== 'DOWN') {
        nextDirectionRef.current = 'UP';
      } else if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && currentDir !== 'UP') {
        nextDirectionRef.current = 'DOWN';
      } else if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && currentDir !== 'RIGHT') {
        nextDirectionRef.current = 'LEFT';
      } else if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && currentDir !== 'LEFT') {
        nextDirectionRef.current = 'RIGHT';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const changeDirection = (newDir: Direction) => {
    if (status !== 'playing') return;
    const currentDir = directionRef.current;
    if (newDir === 'UP' && currentDir !== 'DOWN') nextDirectionRef.current = 'UP';
    if (newDir === 'DOWN' && currentDir !== 'UP') nextDirectionRef.current = 'DOWN';
    if (newDir === 'LEFT' && currentDir !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (newDir === 'RIGHT' && currentDir !== 'LEFT') nextDirectionRef.current = 'RIGHT';
    synthEngine.playTurnSound();
  };

  const startGame = () => {
    snakeRef.current = [
      { x: 11, y: 11 },
      { x: 10, y: 11 },
      { x: 9, y: 11 },
    ];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    foodRef.current = generateNewFood();
    bonusFoodRef.current = null;
    particlesRef.current = [];
    comboRef.current = 1;

    // Reset timer
    timeRemainingRef.current = ONE_MIN_DURATION;
    setTimeLeft(ONE_MIN_DURATION);
    lastSecondTickRef.current = ONE_MIN_DURATION;

    setScore(0);
    setFruitsEaten(0);
    setCombo(1);
    setMaxCombo(1);
    setLastEatTime(0);
    setStatus('playing');

    if (!synthEngine.isPlaying()) {
      synthEngine.play();
    }
  };

  // Rendering and 1-minute countdown loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      const deltaMs = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;

      // 1-Minute Countdown update when playing
      if (statusRef.current === 'playing' && gameModeRef.current === '1min') {
        const deltaSeconds = deltaMs / 1000;
        timeRemainingRef.current = Math.max(0, timeRemainingRef.current - deltaSeconds);
        setTimeLeft(timeRemainingRef.current);

        // Sound cues when low on time
        const currentSecInt = Math.ceil(timeRemainingRef.current);
        if (currentSecInt <= 10 && currentSecInt > 0 && currentSecInt < lastSecondTickRef.current) {
          synthEngine.playTimerTick(currentSecInt <= 5);
          lastSecondTickRef.current = currentSecInt;
        }

        // Time up condition
        if (timeRemainingRef.current <= 0) {
          handleGameOver('time-up');
          return;
        }
      }

      // Step snake movement logic
      const stepMs = SPEED_CONFIG[difficulty];
      if (time - lastTickTimeRef.current > stepMs) {
        updateGameLogic();
        lastTickTimeRef.current = time;
      }

      // Canvas Drawing
      const width = canvas.width;
      const height = canvas.height;
      const tileSize = width / GRID_SIZE;

      ctx.clearRect(0, 0, width, height);

      // Subtle Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        const p = i * tileSize;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(width, p);
        ctx.stroke();
      }

      // Border glow
      ctx.strokeStyle = statusRef.current === 'playing' && timeRemainingRef.current <= 10 && gameModeRef.current === '1min'
        ? 'rgba(255, 0, 85, 0.4)'
        : 'rgba(57, 255, 20, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Draw Standard Food (Magenta Core)
      const food = foodRef.current;
      const pulse = Math.sin(time * 0.008) * 0.15 + 0.85;
      const foodRadius = (tileSize / 2) * 0.75 * pulse;
      const foodCenterX = (food.x + 0.5) * tileSize;
      const foodCenterY = (food.y + 0.5) * tileSize;

      ctx.save();
      ctx.shadowColor = '#FF00FF';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FF00FF';
      ctx.beginPath();
      ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
      ctx.fill();

      // Food inner spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(foodCenterX, foodCenterY, foodRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Bonus Food (Electric Cyan Star)
      if (bonusFoodRef.current) {
        const bFood = bonusFoodRef.current;
        const bPulse = Math.sin(time * 0.015) * 0.2 + 0.9;
        const bRadius = (tileSize / 2) * 0.9 * bPulse;
        const bCenterX = (bFood.x + 0.5) * tileSize;
        const bCenterY = (bFood.y + 0.5) * tileSize;

        ctx.save();
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(bCenterX, bCenterY - bRadius);
        ctx.lineTo(bCenterX + bRadius, bCenterY);
        ctx.lineTo(bCenterX, bCenterY + bRadius);
        ctx.lineTo(bCenterX - bRadius, bCenterY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bCenterX - 2, bCenterY - 2, 4, 4);
        ctx.restore();
      }

      // Draw Snake Body & Head in Vibrant Neon Green #39FF14
      const snake = snakeRef.current;
      snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        const segX = seg.x * tileSize;
        const segY = seg.y * tileSize;
        const segW = tileSize;
        const segH = tileSize;

        ctx.save();
        if (isHead) {
          ctx.fillStyle = '#39FF14';
          ctx.shadowColor = '#39FF14';
          ctx.shadowBlur = 16;

          // Head square
          ctx.beginPath();
          ctx.roundRect(segX, segY, segW, segH, 4);
          ctx.fill();

          // Cyber Eyes
          ctx.fillStyle = '#050505';
          ctx.shadowBlur = 0;
          const eyeSize = 3;
          const dir = directionRef.current;
          let eye1 = { x: segX + 4, y: segY + 4 };
          let eye2 = { x: segX + segW - 7, y: segY + 4 };

          if (dir === 'DOWN') {
            eye1 = { x: segX + 4, y: segY + segH - 7 };
            eye2 = { x: segX + segW - 7, y: segY + segH - 7 };
          } else if (dir === 'LEFT') {
            eye1 = { x: segX + 4, y: segY + 4 };
            eye2 = { x: segX + 4, y: segY + segH - 7 };
          } else if (dir === 'RIGHT') {
            eye1 = { x: segX + segW - 7, y: segY + 4 };
            eye2 = { x: segX + segW - 7, y: segY + segH - 7 };
          }

          ctx.fillRect(eye1.x, eye1.y, eyeSize, eyeSize);
          ctx.fillRect(eye2.x, eye2.y, eyeSize, eyeSize);
        } else {
          // Body segments with subtle opacity gradient
          const ratio = Math.max(0.2, 1 - (idx / (snake.length + 3)) * 0.85);
          ctx.fillStyle = `rgba(57, 255, 20, ${ratio})`;
          ctx.shadowColor = '#39FF14';
          ctx.shadowBlur = ratio > 0.5 ? 8 : 2;

          ctx.beginPath();
          ctx.roundRect(segX + 1, segY + 1, segW - 2, segH - 2, 3);
          ctx.fill();
        }
        ctx.restore();
      });

      // Update & Draw Particles
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life < p.maxLife) {
          activeParticles.push(p);

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      particlesRef.current = activeParticles;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, handleGameOver, updateGameLogic]);

  // Format timer into 00:SS.d format
  const formatTimerDisplay = (seconds: number) => {
    const s = Math.floor(seconds);
    const ms = Math.floor((seconds - s) * 10);
    const formattedSecs = s < 10 ? `0${s}` : `${s}`;
    return `00:${formattedSecs}.${ms}`;
  };

  const timerPercent = (timeLeft / ONE_MIN_DURATION) * 100;
  const isUrgent = gameMode === '1min' && timeLeft <= 10 && status === 'playing';

  return (
    <div
      id="snake-game-window"
      className="flex flex-col items-center justify-center relative w-full"
    >
      {/* Top Arcade Navigation & Mode Selector */}
      <div className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono border-b border-[#222] bg-[#0a0a0a] rounded-t-xl">
        {/* Game Mode Selector: 1-Min Blitz vs Endless */}
        <div className="flex items-center gap-1.5">
          <button
            id="mode-1min-btn"
            onClick={() => {
              if (status === 'playing') setStatus('idle');
              setGameMode('1min');
              setTimeLeft(ONE_MIN_DURATION);
              timeRemainingRef.current = ONE_MIN_DURATION;
            }}
            className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              gameMode === '1min'
                ? 'bg-[#39FF14] text-black shadow-[0_0_12px_rgba(57,255,20,0.5)]'
                : 'bg-[#111] text-[#777] hover:text-[#bbb] border border-[#222]'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            1-MIN BLITZ
          </button>

          <button
            id="mode-endless-btn"
            onClick={() => {
              if (status === 'playing') setStatus('idle');
              setGameMode('endless');
            }}
            className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              gameMode === 'endless'
                ? 'bg-[#00FFFF] text-black shadow-[0_0_12px_rgba(0,255,255,0.5)]'
                : 'bg-[#111] text-[#777] hover:text-[#bbb] border border-[#222]'
            }`}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            ENDLESS
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-[#111] p-0.5 rounded-lg border border-[#222]">
          {(['casual', 'normal', 'overdrive'] as Difficulty[]).map((d) => (
            <button
              key={d}
              id={`difficulty-${d}-btn`}
              onClick={() => setDifficulty(d)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                difficulty === d
                  ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/50 shadow-sm'
                  : 'text-[#666] hover:text-[#bbb]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent 1-Minute Max Timer Bar */}
      {gameMode === '1min' && (
        <div
          id="blitz-timer-hud"
          className={`w-full px-4 py-2 border-b border-[#222] bg-[#0c0c0c] flex flex-col gap-1 transition-colors ${
            isUrgent ? 'bg-rose-950/40 border-rose-600/50' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  isUrgent ? 'text-rose-400 animate-bounce' : 'text-[#39FF14]'
                }`}
              />
              <span className="text-[10px] font-mono tracking-widest text-[#888] uppercase font-bold">
                1-MIN MAX TIMER
              </span>
              {isUrgent && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold animate-pulse">
                  HURRY UP! ⚡
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                id="countdown-clock-digits"
                className={`font-mono text-base sm:text-lg font-black tracking-wider transition-colors ${
                  isUrgent
                    ? 'text-rose-400 animate-pulse drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                    : timeLeft <= 20
                    ? 'text-amber-300'
                    : 'text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]'
                }`}
              >
                {formatTimerDisplay(timeLeft)}
              </span>

              <span className="text-[10px] font-mono text-[#666]">
                BEST: <strong className="text-[#00FFFF]">{oneMinHighScore.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                isUrgent
                  ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                  : timeLeft <= 20
                  ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, timerPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Center Canvas Container */}
      <div className="relative w-full aspect-square max-w-[480px] bg-[#050505] border-x-2 border-b-2 border-[#1a1a1a] rounded-b-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] flex items-center justify-center">
        <canvas
          id="snake-canvas"
          ref={canvasRef}
          width={440}
          height={440}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Idle / Start Overlay */}
        {status === 'idle' && (
          <div
            id="game-idle-overlay"
            className="absolute inset-0 bg-[#050505]/92 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn"
          >
            <div className="p-3.5 rounded-full bg-[#111] border border-[#39FF14]/40 shadow-[0_0_20px_rgba(57,255,20,0.3)] mb-4">
              <Timer className="w-8 h-8 text-[#39FF14] animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide">
              {gameMode === '1min' ? '1-MIN SERPENT RUSH' : 'SYNTH-SERPENT GRID'}
            </h2>
            <p className="text-xs sm:text-sm text-[#888] max-w-xs mt-2 font-medium">
              {gameMode === '1min'
                ? 'You have 60 seconds on the clock! Collect as many neon cores and combos as possible to set your highest record.'
                : 'Survive in the matrix as long as you can while cyber beats synthesize procedural patterns.'}
            </p>

            <button
              id="start-game-btn"
              onClick={startGame}
              className="mt-6 px-6 py-2.5 rounded-xl font-bold font-display text-sm tracking-wider text-black bg-[#39FF14] hover:bg-[#32e012] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(57,255,20,0.5)] flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              {gameMode === '1min' ? 'START 60s BLITZ' : 'START RUN'}
            </button>
            <span className="text-[11px] font-mono text-[#555] mt-3">
              Press [SPACE] or Click to Play
            </span>
          </div>
        )}

        {/* Paused Overlay */}
        {status === 'paused' && (
          <div
            id="game-paused-overlay"
            className="absolute inset-0 bg-[#050505]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn"
          >
            <div className="p-3 rounded-full bg-[#111] border border-[#00FFFF]/50 mb-3 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
              <Pause className="w-7 h-7 text-[#00FFFF]" />
            </div>
            <h3 className="text-2xl font-black font-display text-[#00FFFF] tracking-wider">
              CIRCUIT PAUSED
            </h3>
            {gameMode === '1min' && (
              <p className="text-xs text-[#39FF14] font-mono mt-1">
                Time Frozen: {formatTimerDisplay(timeLeft)}
              </p>
            )}
            <button
              id="resume-game-btn"
              onClick={() => setStatus('playing')}
              className="mt-5 px-5 py-2 rounded-xl font-bold font-display text-sm text-black bg-[#00FFFF] hover:bg-[#00e5e5] transition-transform active:scale-95 shadow-lg shadow-[#00FFFF]/30 cursor-pointer"
            >
              RESUME RUN
            </button>
          </div>
        )}

        {/* Game Over Overlay (Time's Up OR Collision) */}
        {status === 'game-over' && (
          <div
            id="game-over-overlay"
            className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn"
          >
            {gameOverReason === 'time-up' ? (
              <>
                <div className="p-3 rounded-full bg-[#0d1d12] border border-[#39FF14]/70 mb-3 shadow-[0_0_25px_rgba(57,255,20,0.5)]">
                  <Trophy className="w-8 h-8 text-[#39FF14] animate-bounce" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-[#39FF14] tracking-wider">
                  TIME'S UP! 60s COMPLETE
                </h3>
                <p className="text-xs text-[#888] font-mono mt-0.5">
                  1-minute session finished. Here is your final record:
                </p>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-[#1a080c] border border-rose-500/60 mb-3 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-rose-400 tracking-wider">
                  CIRCUIT BREACH
                </h3>
                {gameMode === '1min' && (
                  <p className="text-xs text-[#888] font-mono mt-0.5">
                    Crashed with {formatTimerDisplay(timeLeft)} remaining on the clock
                  </p>
                )}
              </>
            )}

            {/* Score Metrics Matrix */}
            <div className="mt-3 flex flex-col items-center gap-1 font-mono">
              <span className="text-xs text-[#777] uppercase">FINAL SCORE</span>
              <span className="text-3xl sm:text-4xl font-black text-white font-display">
                {score.toLocaleString()}
              </span>

              {/* Record High Badge */}
              {gameMode === '1min' ? (
                score >= oneMinHighScore && score > 0 && (
                  <span className="text-[11px] font-bold text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/40 px-3 py-0.5 rounded-full mt-1">
                    NEW 1-MIN BLITZ RECORD! 🏆
                  </span>
                )
              ) : (
                score >= highScore && score > 0 && (
                  <span className="text-[11px] font-bold text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/40 px-3 py-0.5 rounded-full mt-1">
                    NEW RECORD HIGH! 🏆
                  </span>
                )
              )}

              {/* Mini stats pills */}
              <div className="flex items-center gap-3 text-[11px] text-[#888] mt-2">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#39FF14]" />
                  {fruitsEaten} Cores
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-[#FF00FF]" />
                  Max x{maxCombo} Combo
                </span>
                {gameMode === '1min' && (
                  <>
                    <span>•</span>
                    <span className="text-[#00FFFF]">
                      {(score / 60).toFixed(1)} Pts/s
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                id="restart-game-btn"
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl font-bold font-display text-sm tracking-wider text-black bg-[#39FF14] hover:bg-[#32e012] transition-transform active:scale-95 shadow-[0_0_20px_rgba(57,255,20,0.5)] flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {gameMode === '1min' ? 'TRY AGAIN (60s)' : 'REBOOT SYSTEM'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Pause button */}
      {status === 'playing' && (
        <div className="absolute top-14 right-4 flex items-center gap-2 z-10">
          <button
            id="pause-game-btn"
            onClick={() => setStatus('paused')}
            className="p-1.5 rounded-lg bg-black/70 border border-[#333] text-[#aaa] hover:text-white hover:border-[#39FF14] transition-colors backdrop-blur-sm cursor-pointer"
            title="Pause Game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile / Touch D-Pad Controls */}
      <div id="virtual-dpad" className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          id="dpad-up"
          onClick={() => changeDirection('UP')}
          aria-label="Up"
          className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] active:bg-[#39FF14] active:text-black flex items-center justify-center text-slate-200 shadow-md"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-6">
          <button
            id="dpad-left"
            onClick={() => changeDirection('LEFT')}
            aria-label="Left"
            className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] active:bg-[#39FF14] active:text-black flex items-center justify-center text-slate-200 shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            id="dpad-down"
            onClick={() => changeDirection('DOWN')}
            aria-label="Down"
            className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] active:bg-[#39FF14] active:text-black flex items-center justify-center text-slate-200 shadow-md"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            id="dpad-right"
            onClick={() => changeDirection('RIGHT')}
            aria-label="Right"
            className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] active:bg-[#39FF14] active:text-black flex items-center justify-center text-slate-200 shadow-md"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
