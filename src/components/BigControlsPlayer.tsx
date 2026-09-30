import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  HardDrive,
  FileAudio,
} from 'lucide-react';
import { AudioTrack } from '../types/audio';
import { formatTime, formatFileSize } from '../utils/audioUtils';

interface BigControlsPlayerProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  audioVisualizerData: number[];
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkipBy: (seconds: number) => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onOpenAddModal: () => void;
}

export const BigControlsPlayer: React.FC<BigControlsPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  audioVisualizerData,
  onTogglePlay,
  onSeek,
  onSkipBy,
  onPlayNext,
  onPlayPrev,
  onVolumeChange,
  onToggleMute,
  onOpenAddModal,
}) => {
  const [isJumboMode, setIsJumboMode] = useState(false);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remainingTime = duration > 0 ? duration - currentTime : 0;

  if (!currentTrack) {
    return (
      <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500/20 via-cyan-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <FileAudio className="w-12 h-12 text-cyan-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          No Track Selected
        </h2>
        <p className="text-slate-400 max-w-md text-sm sm:text-base mb-8">
          Select any track from Period 1, 2, or 3 below, or upload new audio files to play with large touch controls.
        </p>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 text-base sm:text-lg active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-6 h-6" />
          <span>Add Audio to SoundBank</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${
        isJumboMode ? 'p-6 sm:p-10 border-indigo-500/40 ring-2 ring-indigo-500/20' : 'p-6 sm:p-8'
      }`}
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isPlaying ? 'bg-indigo-500/15 opacity-100' : 'bg-indigo-500/5 opacity-50'
        }`}
      />
      <div
        className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isPlaying ? 'bg-cyan-500/15 opacity-100' : 'bg-cyan-500/5 opacity-50'
        }`}
      />

      {/* Header bar: Track Info & Jumbo Mode Toggle */}
      <div className="flex items-start justify-between gap-4 relative z-10 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <HardDrive className="w-3 h-3" />
              <span>Offline Ready</span>
            </span>
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-mono">
              {formatFileSize(currentTrack.size)}
            </span>
          </div>

          <h2
            className={`font-black text-white tracking-tight leading-tight truncate ${
              isJumboMode ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'
            }`}
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium truncate mt-0.5">
            {currentTrack.artist || 'English Grade 8'}
          </p>
        </div>

        {/* Jumbo touch mode switch button */}
        <button
          onClick={() => setIsJumboMode(!isJumboMode)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
            isJumboMode
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
          }`}
          title="Toggle Large Touchscreen Mode"
        >
          {isJumboMode ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Normal Size</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Jumbo Buttons</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Sound Wave Visualizer */}
      <div className="relative z-10 w-full mb-6 bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
        <div className="flex items-end justify-between h-14 sm:h-20 gap-1 px-1">
          {audioVisualizerData.map((bar, idx) => {
            const isFilled = idx / audioVisualizerData.length <= progressPercent / 100;
            return (
              <div
                key={idx}
                className="flex-1 rounded-full transition-all duration-75 min-w-[3px]"
                style={{
                  height: `${Math.max(10, bar * 100)}%`,
                  backgroundColor: isFilled
                    ? isPlaying
                      ? '#38bdf8'
                      : '#6366f1'
                    : '#334155',
                  opacity: isFilled ? 1 : 0.4,
                  boxShadow:
                    isPlaying && isFilled
                      ? '0 0 8px rgba(56, 189, 248, 0.4)'
                      : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Scrubbing & Progress Bar with Large Touch Target */}
      <div className="relative z-10 mb-6">
        <div className="relative group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-3 sm:h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            aria-label="Seek track position"
          />
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 mt-2 font-medium">
          <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-slate-400">-{formatTime(remainingTime)}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE MAIN LARGE CONTROLS ROW - Specially crafted for large button play/pause */}
      {/* ========================================================================= */}
      <div
        className={`relative z-10 flex items-center justify-center gap-3 sm:gap-6 ${
          isJumboMode ? 'my-8 sm:my-10 scale-105' : 'my-4 sm:my-6'
        }`}
      >
        {/* Previous Track */}
        <button
          onClick={onPlayPrev}
          className={`rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-md cursor-pointer ${
            isJumboMode ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'
          }`}
          aria-label="Previous track"
          title="Previous Track"
        >
          <SkipBack className={isJumboMode ? 'w-8 h-8' : 'w-6 h-6'} />
        </button>

        {/* Skip Backward 15s */}
        <button
          onClick={() => onSkipBy(-15)}
          className={`rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center transition-all active:scale-90 shadow-md relative group cursor-pointer ${
            isJumboMode ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'
          }`}
          aria-label="Skip back 15 seconds"
          title="Rewind 15 seconds"
        >
          <RotateCcw className={isJumboMode ? 'w-7 h-7' : 'w-5 h-5'} />
          <span className="text-[10px] font-bold font-mono text-cyan-400 -mt-0.5">15</span>
        </button>

        {/* =================================================================== */}
        {/* HUGE MAIN PLAY / PAUSE BUTTON - Extra large, high contrast, tactile */}
        {/* =================================================================== */}
        <button
          onClick={onTogglePlay}
          className={`rounded-3xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xl ${
            isPlaying
              ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-orange-500/40 ring-4 ring-orange-500/30'
              : 'bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 text-white shadow-indigo-500/50 ring-4 ring-cyan-500/30 animate-pulse'
          } ${
            isJumboMode
              ? 'w-28 h-28 sm:w-36 sm:h-36'
              : 'w-20 h-20 sm:w-24 sm:h-24'
          }`}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <Pause
              className={`fill-current ${
                isJumboMode ? 'w-14 h-14 sm:w-18 sm:h-18' : 'w-10 h-10 sm:w-12 sm:h-12'
              }`}
            />
          ) : (
            <Play
              className={`fill-current translate-x-1 ${
                isJumboMode ? 'w-14 h-14 sm:w-18 sm:h-18' : 'w-10 h-10 sm:w-12 sm:h-12'
              }`}
            />
          )}
        </button>

        {/* Skip Forward 15s */}
        <button
          onClick={() => onSkipBy(15)}
          className={`rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center transition-all active:scale-90 shadow-md relative group cursor-pointer ${
            isJumboMode ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'
          }`}
          aria-label="Skip forward 15 seconds"
          title="Fast forward 15 seconds"
        >
          <RotateCw className={isJumboMode ? 'w-7 h-7' : 'w-5 h-5'} />
          <span className="text-[10px] font-bold font-mono text-cyan-400 -mt-0.5">15</span>
        </button>

        {/* Next Track */}
        <button
          onClick={onPlayNext}
          className={`rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-md cursor-pointer ${
            isJumboMode ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'
          }`}
          aria-label="Next track"
          title="Next Track"
        >
          <SkipForward className={isJumboMode ? 'w-8 h-8' : 'w-6 h-6'} />
        </button>
      </div>

      {/* Accessibility Helper Text */}
      <div className="text-center text-xs text-slate-400 font-medium mb-6">
        <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-cyan-300">Space</kbd> to Play / Pause</span>
        <span className="mx-2">•</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-cyan-300">← / →</kbd> to Skip ±15s</span>
      </div>

      {/* ========================================================================= */}
      {/* SECONDARY ROW: Clean Volume Control Only (No Repeat, Speed, Sleep buttons) */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 text-sm">
        <div className="text-xs text-slate-400 font-medium truncate">
          <span>Now Playing: </span>
          <span className="text-slate-200 font-semibold">{currentTrack.title}</span>
        </div>

        {/* Volume Slider with Mute button */}
        <div className="flex items-center gap-2 bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-700/60 shrink-0">
          <button
            onClick={onToggleMute}
            className="text-slate-300 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-24 sm:w-36 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            aria-label="Adjust Volume"
          />
        </div>
      </div>
    </div>
  );
};
