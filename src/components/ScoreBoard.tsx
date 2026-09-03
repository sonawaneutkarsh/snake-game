import React from 'react';
import { Trophy, Zap, Target, Flame, Clock } from 'lucide-react';
import { GameStats } from '../types';

interface ScoreBoardProps {
  stats: GameStats;
  primaryColor?: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ stats, primaryColor = '#39FF14' }) => {
  const is1Min = stats.gameMode === '1min';
  const isUrgent = is1Min && stats.timeRemaining <= 10 && stats.status === 'playing';

  return (
    <div
      id="neon-score-board"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full"
    >
      {/* Current Score */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-widest text-[#39FF14] font-bold uppercase flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#39FF14]" />
            SCORE
          </span>
          <span className="text-[10px] font-mono text-[#555]">PTS</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight"
            style={{ textShadow: `0 0 10px ${primaryColor}80` }}
          >
            {stats.score.toLocaleString()}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#39FF14] to-transparent" />
      </div>

      {/* 1-Minute Timer OR High Score */}
      {is1Min ? (
        <div className={`bg-[#0a0a0a] border rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden transition-colors ${
          isUrgent ? 'border-rose-500 bg-rose-950/20' : 'border-[#222]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-mono tracking-widest font-bold uppercase flex items-center gap-1 ${
              isUrgent ? 'text-rose-400' : 'text-[#39FF14]'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              1-MIN TIMER
            </span>
            <span className="text-[10px] font-mono text-[#555]">60S MAX</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${
              isUrgent ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_#f43f5e]' : 'text-white'
            }`}>
              00:{Math.floor(stats.timeRemaining).toString().padStart(2, '0')}
            </span>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
            isUrgent ? 'bg-rose-500' : 'bg-gradient-to-r from-[#39FF14] to-transparent'
          }`} />
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-widest text-[#00FFFF] font-bold uppercase flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[#00FFFF]" />
              HIGH SCORE
            </span>
            <span className="text-[10px] font-mono text-[#555]">BEST</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-display text-[#00FFFF] tracking-tight drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFFF] to-transparent" />
        </div>
      )}

      {/* Mode Record High Score / Cores Eaten */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-widest text-[#00FFFF] font-bold uppercase flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#00FFFF]" />
            {is1Min ? '1-MIN BEST' : 'CORES EATEN'}
          </span>
          <span className="text-[10px] font-mono text-[#555]">{is1Min ? 'RECORD' : 'QTY'}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-black font-display text-[#00FFFF] tracking-tight">
            {is1Min ? stats.oneMinHighScore.toLocaleString() : stats.fruitsEaten}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFFF] to-transparent" />
      </div>

      {/* Combo Multiplier */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-widest text-[#FF00FF] font-bold uppercase flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#FF00FF]" />
            COMBO
          </span>
          <span className="text-[10px] font-mono text-[#555]">BOOST</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-black font-display text-[#FF00FF] tracking-tight drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]">
            x{Math.max(1, stats.combo)}
          </span>
          {stats.combo > 1 && (
            <span className="text-xs font-mono text-[#FF00FF] animate-pulse font-bold">
              FIRE!
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF00FF] to-transparent" />
      </div>
    </div>
  );
};
