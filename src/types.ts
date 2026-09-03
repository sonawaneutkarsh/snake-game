export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  duration: number; // in seconds
  primaryColor: string;
  accentColor: string;
  tag: string;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export interface FoodItem {
  x: number;
  y: number;
  type: 'standard' | 'bonus';
  points: number;
  createdAt: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'game-over';

export type GameMode = '1min' | 'endless';

export type GameOverReason = 'collision' | 'time-up';

export type Difficulty = 'casual' | 'normal' | 'overdrive';

export interface GameStats {
  score: number;
  highScore: number;
  oneMinHighScore: number;
  fruitsEaten: number;
  combo: number;
  maxCombo: number;
  timeRemaining: number;
  gameMode: GameMode;
  status: GameStatus;
  gameOverReason?: GameOverReason;
}
