import React from 'react';
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
  FileAudio,
} from 'lucide-react';
import { AudioTrack } from '../types/audio';
import { formatTime } from '../utils/audioUtils';

interface BigControlsPlayerProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
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
  onTogglePlay,
  onSeek,
  onSkipBy,
  onPlayNext,
  onPlayPrev,
  onVolumeChange,
  onToggleMute,
  onOpenAddModal,
}) => {
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
          <span>Add Audio to EnglishPractice</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl transition-all duration-300 relative overflow-hidden">
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

      {/* Header bar: Full-width wrapped audio title */}
      <div className="relative z-10 mb-4 sm:mb-6">
        <h2 className="font-black text-white tracking-tight leading-snug break-words whitespace-normal text-xl sm:text-2xl md:text-3xl">
          {currentTrack.title}
        </h2>
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
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 my-4 sm:my-6">
        {/* Previous Track */}
        <button
          onClick={onPlayPrev}
          className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-md cursor-pointer shrink-0"
          aria-label="Previous track"
          title="Previous Track"
        >
          <SkipBack className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Skip Backward 15s */}
        <button
          onClick={() => onSkipBy(-15)}
          className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center transition-all active:scale-90 shadow-md relative group cursor-pointer shrink-0"
          aria-label="Skip back 15 seconds"
          title="Rewind 15 seconds"
        >
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-bold font-mono text-cyan-400 -mt-0.5">15</span>
        </button>

        {/* =================================================================== */}
        {/* HUGE MAIN PLAY / PAUSE BUTTON - Extra large, high contrast, tactile */}
        {/* =================================================================== */}
        <button
          onClick={onTogglePlay}
          className={`w-22 h-22 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xl shrink-0 ${
            isPlaying
              ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-orange-500/40 ring-4 ring-orange-500/30'
              : 'bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 text-white shadow-indigo-500/50 ring-4 ring-cyan-500/30 animate-pulse'
          }`}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <Pause className="w-11 h-11 sm:w-14 sm:h-14 fill-current" />
          ) : (
            <Play className="w-11 h-11 sm:w-14 sm:h-14 fill-current translate-x-1" />
          )}
        </button>

        {/* Skip Forward 15s */}
        <button
          onClick={() => onSkipBy(15)}
          className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center transition-all active:scale-90 shadow-md relative group cursor-pointer shrink-0"
          aria-label="Skip forward 15 seconds"
          title="Fast forward 15 seconds"
        >
          <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-bold font-mono text-cyan-400 -mt-0.5">15</span>
        </button>

        {/* Next Track */}
        <button
          onClick={onPlayNext}
          className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-md cursor-pointer shrink-0"
          aria-label="Next track"
          title="Next Track"
        >
          <SkipForward className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECONDARY ROW: Clean Volume Control Only */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-center">
        {/* Volume Slider with Mute button */}
        <div className="flex items-center gap-3 bg-slate-800/70 px-4 py-2 rounded-2xl border border-slate-700/60 w-full sm:w-auto justify-center max-w-sm">
          <button
            onClick={onToggleMute}
            className="text-slate-300 hover:text-white cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-cyan-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full sm:w-48 h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            aria-label="Adjust Volume"
          />
        </div>
      </div>
    </div>
  );
};

