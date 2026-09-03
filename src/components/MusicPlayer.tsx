import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Disc3, Radio, Activity, Music } from 'lucide-react';
import { DEMO_TRACKS, synthEngine } from '../audio/synthEngine';
import { Track } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface SharedAudioProps {
  currentTrack: Track;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectTrack: (idx: number) => void;
}

export const PlaylistSidebar: React.FC<{
  currentTrack: Track;
  isPlaying: boolean;
  onSelectTrack: (idx: number) => void;
}> = ({ currentTrack, isPlaying, onSelectTrack }) => {
  return (
    <aside
      id="playlist-sidebar"
      className="w-full lg:w-72 xl:w-80 bg-[#080808] border-r border-[#1a1a1a] flex flex-col p-4 lg:p-6 overflow-y-auto flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-bold font-mono flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[#39FF14]" />
          PLAYLIST: AI SESSIONS
        </h2>
        <span className="text-[10px] font-mono text-[#444] px-1.5 py-0.5 rounded bg-[#111] border border-[#222]">
          3 TRACKS
        </span>
      </div>

      {/* Playlist tracks */}
      <div className="flex flex-col gap-2">
        {DEMO_TRACKS.map((track, idx) => {
          const isActive = track.id === currentTrack.id;
          return (
            <div
              key={track.id}
              id={`playlist-item-${idx}`}
              onClick={() => onSelectTrack(idx)}
              className={`p-3 transition-all flex items-center gap-3.5 cursor-pointer rounded-lg ${
                isActive
                  ? 'bg-[#111] border-l-2 border-[#39FF14] text-white shadow-lg'
                  : 'hover:bg-[#0f0f0f] text-[#888] hover:text-[#ddd] border-l-2 border-transparent'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 transition-colors ${
                  isActive ? 'bg-[#1a1a1a] text-[#39FF14]' : 'bg-[#111] text-[#555]'
                }`}
              >
                {isActive && isPlaying ? (
                  <Activity className="w-5 h-5 text-[#39FF14] animate-pulse" />
                ) : (
                  <span>0{idx + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-[#bbb]'}`}>
                    {track.title}
                  </h3>
                  <span className="text-[11px] font-mono text-[#555] flex-shrink-0">
                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#666] mt-0.5">
                  <span className="truncate">{track.artist}</span>
                  <span className="text-[10px] text-[#444]">{track.bpm} BPM</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frequency & Live Telemetry Card at Bottom of Playlist */}
      <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex flex-col gap-3">
        <AudioVisualizer
          isPlaying={isPlaying}
          primaryColor={currentTrack.primaryColor}
          accentColor={currentTrack.accentColor}
        />

        <div className="rounded-xl bg-[#111] border border-[#222] p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#666] uppercase tracking-wider">SYNTH ENGINE</span>
            <span className="text-[#39FF14] font-bold">ONLINE</span>
          </div>
          <p className="text-[10px] text-[#666] leading-relaxed font-mono">
            Procedural Web Audio synthesis locked to snake game clock. No external audio files required.
          </p>
        </div>
      </div>
    </aside>
  );
};

export const NowPlayingSidebar: React.FC<{
  currentTrack: Track;
  isPlaying: boolean;
  onPlayToggle: () => void;
  elapsed: number;
  duration: number;
}> = ({ currentTrack, isPlaying, onPlayToggle, elapsed, duration }) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <aside
      id="now-playing-sidebar"
      className="w-full lg:w-72 xl:w-80 bg-[#080808] border-l border-[#1a1a1a] p-4 lg:p-6 flex flex-col overflow-y-auto flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-bold font-mono">
          NOW PLAYING
        </h2>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-widest font-bold"
          style={{
            borderColor: `${currentTrack.primaryColor}40`,
            color: currentTrack.primaryColor,
            backgroundColor: `${currentTrack.primaryColor}10`,
          }}
        >
          {currentTrack.tag}
        </span>
      </div>

      {/* Album Artwork Card with vinyl disc */}
      <div
        id="album-art-panel"
        onClick={onPlayToggle}
        className="aspect-square rounded-2xl bg-gradient-to-br from-[#161616] to-[#060606] border border-[#222] overflow-hidden relative group mb-4 flex items-center justify-center shadow-2xl cursor-pointer"
        style={{
          boxShadow: isPlaying ? `0 0 35px ${currentTrack.primaryColor}20` : 'none',
        }}
      >
        <div
          className={`w-3/4 h-3/4 rounded-full flex items-center justify-center transition-transform duration-1000 ${
            isPlaying ? 'animate-spin' : ''
          }`}
          style={{
            animationDuration: '7s',
            background: `radial-gradient(circle, #222 25%, #111 50%, ${currentTrack.primaryColor}30 85%, #050505 100%)`,
            border: '2px solid #2a2a2a',
          }}
        >
          <Disc3
            className="w-16 h-16 text-white/90 drop-shadow-lg"
            style={{ filter: `drop-shadow(0 0 10px ${currentTrack.primaryColor})` }}
          />
        </div>

        {/* Center spindle */}
        <div className="absolute w-5 h-5 rounded-full bg-[#050505] border border-white/60 pointer-events-none" />

        {/* Play/pause hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white tracking-wide truncate font-display">
          {currentTrack.title}
        </h3>
        <p className="text-xs text-[#888] font-mono mt-0.5 truncate">{currentTrack.artist}</p>
        <div className="flex items-center justify-between text-xs text-[#39FF14] font-mono mt-1">
          <span>{formatTime(elapsed)}</span>
          <span className="text-[#555]">/</span>
          <span className="text-[#888]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Synth Telemetry / Audio Metrics */}
      <div className="flex flex-col gap-3 py-3 border-y border-[#1a1a1a]">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#666] mb-1">
            <span>COMPLEXITY</span>
            <span className="text-[#00FFFF] font-bold">78%</span>
          </div>
          <div className="w-full h-1.5 bg-[#161616] rounded-full overflow-hidden">
            <div className="h-full bg-[#00FFFF] rounded-full shadow-[0_0_8px_#00FFFF]" style={{ width: '78%' }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#666] mb-1">
            <span>TEMPO / BPM</span>
            <span className="text-[#39FF14] font-bold">{currentTrack.bpm} BPM</span>
          </div>
          <div className="w-full h-1.5 bg-[#161616] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#39FF14] rounded-full shadow-[0_0_8px_#39FF14]"
              style={{ width: `${Math.min(100, (currentTrack.bpm / 160) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game Scoring Legend */}
      <div className="mt-4 pt-1 flex flex-col gap-2 text-[11px] font-mono">
        <span className="text-[10px] uppercase tracking-wider text-[#666] font-bold flex items-center gap-1">
          <Music className="w-3.5 h-3.5 text-[#39FF14]" />
          CIRCUIT TELEMETRY
        </span>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#888]">
          <div className="flex items-center gap-2 bg-[#111] p-2 rounded-lg border border-[#222]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF00FF] shadow-[0_0_8px_#FF00FF] flex-shrink-0" />
            <span>Food (+100)</span>
          </div>
          <div className="flex items-center gap-2 bg-[#111] p-2 rounded-lg border border-[#222]">
            <span className="w-2.5 h-2.5 rounded bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] flex-shrink-0" />
            <span>Star (+300)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const AudioTransportBar: React.FC<{
  currentTrack: Track;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  elapsed: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
}> = ({
  currentTrack,
  isPlaying,
  onPlayToggle,
  onNext,
  onPrev,
  elapsed,
  duration,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <footer
      id="audio-transport-bar"
      className="h-20 sm:h-24 bg-[#0d0d0d] border-t border-[#1a1a1a] px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-6 z-50 flex-shrink-0"
    >
      {/* Left: Mini Track Thumb & Titles */}
      <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#1a1a1a] border flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden shadow-lg"
          onClick={onPlayToggle}
          style={{ borderColor: `${currentTrack.primaryColor}80` }}
        >
          <Disc3
            className={`w-6 h-6 text-white ${isPlaying ? 'animate-spin' : ''}`}
            style={{
              color: currentTrack.primaryColor,
              animationDuration: '5s',
            }}
          />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white truncate font-display">{currentTrack.title}</h4>
          <p className="text-[11px] text-[#666] font-mono truncate">{currentTrack.artist}</p>
          <span
            className="text-[9px] font-mono uppercase font-bold tracking-wider hidden sm:inline-block"
            style={{ color: currentTrack.primaryColor }}
          >
            {currentTrack.tag}
          </span>
        </div>
      </div>

      {/* Center: Controls & Seeker */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            id="transport-prev-btn"
            onClick={onPrev}
            aria-label="Previous Track"
            className="p-1.5 rounded-lg text-[#666] hover:text-white transition-colors cursor-pointer"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            id="transport-play-pause-btn"
            onClick={onPlayToggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)] cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            id="transport-next-btn"
            onClick={onNext}
            aria-label="Next Track"
            className="p-1.5 rounded-lg text-[#666] hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Seeker bar */}
        <div className="w-full flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-mono text-[#555] w-8 text-right flex-shrink-0">
            {formatTime(elapsed)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              id="transport-progress-slider"
              type="range"
              min={0}
              max={duration || 60}
              step={0.1}
              value={elapsed}
              onChange={onSeek}
              className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#39FF14] focus:outline-none"
              style={{
                background: `linear-gradient(to right, #39FF14 0%, #39FF14 ${
                  (elapsed / (duration || 60)) * 100
                }%, #222 ${(elapsed / (duration || 60)) * 100}%, #222 100%)`,
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-[#555] w-8 flex-shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Sound Info */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/4 sm:w-1/3">
        <button
          id="transport-mute-toggle"
          onClick={onToggleMute}
          aria-label="Toggle Mute"
          className="p-1.5 text-[#666] hover:text-white transition-colors cursor-pointer"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#39FF14]" />
          )}
        </button>
        <input
          id="transport-volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={onVolumeChange}
          className="w-14 sm:w-20 h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#39FF14]"
        />
      </div>
    </footer>
  );
};

export const MusicPlayer: React.FC<SharedAudioProps> = (props) => {
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(props.currentTrack.duration);
  const [volume, setVolume] = useState(synthEngine.getVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.7);

  useEffect(() => {
    setDuration(props.currentTrack.duration);
  }, [props.currentTrack]);

  useEffect(() => {
    synthEngine.setProgressCallback((el, dur) => {
      setElapsed(el);
      setDuration(dur);
    });

    synthEngine.setTrackEndCallback(() => {
      props.onNext();
    });
  }, [props.onNext]);

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
    <div className="flex flex-col gap-4">
      <NowPlayingSidebar
        currentTrack={props.currentTrack}
        isPlaying={props.isPlaying}
        onPlayToggle={props.onPlayToggle}
        elapsed={elapsed}
        duration={duration}
      />
    </div>
  );
};
