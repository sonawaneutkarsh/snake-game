import React, { useState, useCallback, useEffect } from 'react';
import { HelpCircle, Sparkles, Timer, Clock } from 'lucide-react';
import { SnakeGame } from './components/SnakeGame';
import { PlaylistSidebar, NowPlayingSidebar, AudioTransportBar } from './components/MusicPlayer';
import { DEMO_TRACKS, synthEngine } from './audio/synthEngine';
import { GameStats, Track } from './types';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track>(DEMO_TRACKS[0]);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(DEMO_TRACKS[0].duration);
  const [volume, setVolume] = useState(synthEngine.getVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.7);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: parseInt(localStorage.getItem('neon_snake_highscore') || '0', 10),
    oneMinHighScore: parseInt(localStorage.getItem('neon_snake_1min_highscore') || '0', 10),
    fruitsEaten: 0,
    combo: 1,
    maxCombo: 1,
    timeRemaining: 60,
    gameMode: '1min',
    status: 'idle',
  });

  const handleScoreUpdate = useCallback((newStats: GameStats) => {
    setStats(newStats);
  }, []);

  const handleNextTrack = useCallback(() => {
    synthEngine.nextTrack();
    const track = synthEngine.getCurrentTrack();
    setCurrentTrack(track);
    setDuration(track.duration);
    setIsPlayingMusic(true);
  }, []);

  const handlePrevTrack = useCallback(() => {
    synthEngine.prevTrack();
    const track = synthEngine.getCurrentTrack();
    setCurrentTrack(track);
    setDuration(track.duration);
    setIsPlayingMusic(true);
  }, []);

  useEffect(() => {
    setDuration(currentTrack.duration);
  }, [currentTrack]);

  useEffect(() => {
    synthEngine.setProgressCallback((el, dur) => {
      setElapsed(el);
      setDuration(dur);
    });

    synthEngine.setTrackEndCallback(() => {
      handleNextTrack();
    });
  }, [handleNextTrack]);

  const handlePlayToggle = () => {
    if (synthEngine.isPlaying()) {
      synthEngine.pause();
      setIsPlayingMusic(false);
    } else {
      synthEngine.play();
      setIsPlayingMusic(true);
    }
  };

  const handleSelectTrack = (idx: number) => {
    synthEngine.play(idx);
    const track = DEMO_TRACKS[idx];
    setCurrentTrack(track);
    setDuration(track.duration);
    setIsPlayingMusic(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setElapsed(val);
    synthEngine.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    synthEngine.setVolume(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      const restoreVol = prevVolume > 0 ? prevVolume : 0.7;
      setVolume(restoreVol);
      setIsMuted(false);
      synthEngine.setVolume(restoreVol);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      synthEngine.setVolume(0);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] text-[#e0e0e0] flex flex-col overflow-hidden font-sans select-none">
      {/* Dynamic Background Glow from current music track */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-[160px] opacity-10 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: currentTrack.primaryColor }}
      />

      {/* Top Navigation Bar adhering to Immersive UI spec */}
      <nav
        id="main-navigation"
        className="h-14 border-b border-[#222] bg-[#0a0a0a] flex items-center justify-between px-4 sm:px-6 shadow-2xl z-50 flex-shrink-0"
      >
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#39FF14] to-[#00FFFF] flex items-center justify-center shadow-[0_0_10px_rgba(57,255,20,0.4)]">
            <div className="w-4 h-4 bg-[#050505] rotate-45" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#888] font-display">
              SYNTH-SERPENT
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#111] border border-[#222] text-[#39FF14] hidden sm:inline-block">
              IMMERSIVE
            </span>
          </div>
        </div>

        {/* Real-Time Score & Timer Telemetry in Nav */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* 1-Minute Max Timer Badge in Nav */}
          {stats.gameMode === '1min' && (
            <div className="flex items-center gap-2 bg-[#111] px-3 py-1 rounded-lg border border-[#222]">
              <Clock
                className={`w-4 h-4 ${
                  stats.timeRemaining <= 10 && stats.status === 'playing'
                    ? 'text-rose-400 animate-spin'
                    : 'text-[#39FF14]'
                }`}
              />
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase tracking-wider text-[#666] font-bold font-mono">
                  1-MIN TIMER
                </span>
                <span
                  className={`text-sm sm:text-base font-mono font-bold leading-none ${
                    stats.timeRemaining <= 10 && stats.status === 'playing'
                      ? 'text-rose-400 animate-pulse'
                      : stats.timeRemaining <= 20
                      ? 'text-amber-300'
                      : 'text-[#39FF14]'
                  }`}
                >
                  00:{Math.floor(stats.timeRemaining).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-[#555] font-bold font-mono">
              Score
            </span>
            <span className="text-lg sm:text-xl font-mono text-[#39FF14] leading-none font-bold">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="w-[1px] h-8 bg-[#222] hidden xs:block" />

          <div className="flex flex-col items-end hidden xs:flex">
            <span className="text-[10px] uppercase tracking-widest text-[#555] font-bold font-mono">
              {stats.gameMode === '1min' ? '1-Min Best' : 'Session High'}
            </span>
            <span className="text-lg sm:text-xl font-mono text-[#00FFFF] leading-none font-bold">
              {(stats.gameMode === '1min' ? stats.oneMinHighScore : stats.highScore).toLocaleString()}
            </span>
          </div>

          <div className="w-[1px] h-8 bg-[#222] hidden md:block" />

          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[10px] uppercase tracking-widest text-[#555] font-bold font-mono">
              Cores / Combo
            </span>
            <span className="text-lg sm:text-xl font-mono text-[#FF00FF] leading-none font-bold">
              {stats.fruitsEaten} • x{Math.max(1, stats.combo)}
            </span>
          </div>

          {/* Quick Help button */}
          <button
            id="quick-help-btn"
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Controls Guide"
            className="p-1.5 rounded-lg bg-[#111] border border-[#222] text-[#666] hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Workspace Layout (Left Playlist - Center Game - Right Now Playing) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Help Banner Modal/Overlay if toggled */}
        {showHelp && (
          <div
            id="help-guide-banner"
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl p-3.5 rounded-xl bg-[#0a0a0a]/95 border border-[#39FF14]/50 text-xs font-mono flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <span>
                <strong>1-MIN MAX TIMER CHALLENGE:</strong> You have 60s to score as much as possible! [W,A,S,D] / [ARROWS] to turn • [SPACE] pause/resume • Fast bites trigger 5x combo boost!
              </span>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-[#39FF14] hover:underline cursor-pointer flex-shrink-0 font-bold"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Left Sidebar: Playlist Sessions */}
        <PlaylistSidebar
          currentTrack={currentTrack}
          isPlaying={isPlayingMusic}
          onSelectTrack={handleSelectTrack}
        />

        {/* Center Screen: Game Arcade Window on Dot Matrix */}
        <section
          id="center-arcade-stage"
          className="flex-1 bg-[#000] flex flex-col items-center justify-center relative p-3 sm:p-6 overflow-y-auto"
        >
          {/* Dot Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none immersive-dot-grid" />

          <div className="w-full max-w-[480px] relative z-10 flex flex-col items-center">
            <SnakeGame
              onScoreUpdate={handleScoreUpdate}
              accentColor={currentTrack.primaryColor}
            />

            {/* Hint Under Arcade */}
            <p className="text-[10px] text-[#444] uppercase tracking-[0.3em] font-bold font-mono mt-3 text-center">
              Arrows / WASD to navigate &bull; Space to pause/resume
            </p>
          </div>
        </section>

        {/* Right Sidebar: Now Playing & Telemetry */}
        <NowPlayingSidebar
          currentTrack={currentTrack}
          isPlaying={isPlayingMusic}
          onPlayToggle={handlePlayToggle}
          elapsed={elapsed}
          duration={duration}
        />
      </main>

      {/* Bottom Persistent Audio Transport Bar */}
      <AudioTransportBar
        currentTrack={currentTrack}
        isPlaying={isPlayingMusic}
        onPlayToggle={handlePlayToggle}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        elapsed={elapsed}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
      />
    </div>
  );
}
