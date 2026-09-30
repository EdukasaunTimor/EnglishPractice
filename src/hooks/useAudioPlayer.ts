import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioTrack, LoopMode } from '../types/audio';
import { updateTrackPosition } from '../services/db';

export function useAudioPlayer(playlist: AudioTrack[]) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [audioVisualizerData, setAudioVisualizerData] = useState<number[]>(new Array(32).fill(0.1));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Persist position every ~5 seconds
      if (currentTrack && Math.floor(audio.currentTime) % 5 === 0) {
        updateTrackPosition(currentTrack.id, audio.currentTime).catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      handleTrackEnd();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Sleep timer interval countdown
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    if (sleepTimerRemaining <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerRemaining(null);
      return;
    }

    const interval = window.setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemaining]);

  // Audio Analyser setup for visualizer
  const setupAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch {
      // AudioContext may be restricted by autoplay or cross-origin
    }
  }, []);

  // Animate visualizer frequency bars
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const updateVisualizer = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const sampleBars = 32;
        const step = Math.floor(bufferLength / sampleBars) || 1;
        const bars: number[] = [];
        for (let i = 0; i < sampleBars; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.max(0.08, val / 255));
        }
        setAudioVisualizerData(bars);
      } else {
        // Fallback procedural animation based on audio currentTime
        const t = Date.now() / 200;
        const bars = Array.from({ length: 32 }, (_, i) => {
          const v = Math.sin(t + i * 0.4) * 0.4 + Math.cos(t * 0.5 + i * 0.2) * 0.3 + 0.35;
          return Math.max(0.1, Math.min(1.0, v));
        });
        setAudioVisualizerData(bars);
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animationFrameRef.current = requestAnimationFrame(updateVisualizer);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Load and play a specific track
  const playTrack = useCallback(async (track: AudioTrack, startFromPosition = true) => {
    if (!audioRef.current) return;
    setupAudioContext();

    // Revoke previous blob url
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(track.blob);
    objectUrlRef.current = url;

    audioRef.current.src = url;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = isMuted ? 0 : volume;

    setCurrentTrack(track);

    if (startFromPosition && track.lastPlayedPosition && track.lastPlayedPosition > 0 && track.lastPlayedPosition < (track.duration - 5)) {
      audioRef.current.currentTime = track.lastPlayedPosition;
      setCurrentTime(track.lastPlayedPosition);
    } else {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      // Play may require user gesture
      setIsPlaying(false);
    }

    // Media Session Integration for Lockscreen / Headphone controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'SoundVault Offline',
        album: track.album || 'SoundVault Offline Audio',
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }
  }, [playbackRate, isMuted, volume, setupAudioContext]);

  // Handle Track Completion
  const handleTrackEnd = useCallback(() => {
    if (loopMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    if (sleepTimerMinutes === 0) {
      // Sleep timer was set to "End of Track"
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerRemaining(null);
      return;
    }

    playNext();
  }, [loopMode, sleepTimerMinutes]);

  // Toggle Play / Pause
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    setupAudioContext();

    if (!currentTrack && playlist.length > 0) {
      playTrack(playlist[0]);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
      }
    }
  }, [currentTrack, playlist, isPlaying, playTrack, setupAudioContext]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Resume error:', err);
      }
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(time, duration || audioRef.current.duration || 0));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    if ('mediaSession' in navigator && isFinite(clamped) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: clamped,
        });
      } catch {
        // positionState unsupported
      }
    }
  }, [duration, playbackRate]);

  const skipBy = useCallback((deltaSeconds: number) => {
    if (!audioRef.current) return;
    const target = (audioRef.current.currentTime || 0) + deltaSeconds;
    seek(target);
  }, [seek]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    if (!currentTrack) {
      playTrack(playlist[0]);
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex === -1) {
      playTrack(playlist[0]);
      return;
    }

    if (currentIndex < playlist.length - 1) {
      playTrack(playlist[currentIndex + 1], false);
    } else if (loopMode === 'all') {
      playTrack(playlist[0], false);
    } else {
      setIsPlaying(false);
    }
  }, [playlist, currentTrack, loopMode, playTrack]);

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return;
    if (!audioRef.current || !currentTrack) {
      playTrack(playlist[0]);
      return;
    }

    // If more than 3 seconds in, jump back to start of current track
    if (audioRef.current.currentTime > 3) {
      seek(0);
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(playlist[currentIndex - 1], false);
    } else {
      // Loop to end or jump to start
      playTrack(playlist[playlist.length - 1], false);
    }
  }, [playlist, currentTrack, playTrack, seek]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes === null || minutes === 0) {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(minutes * 60);
    }
  }, []);

  // Sync Media Session Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      skipBy(-(details.seekOffset || 15));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      skipBy(details.seekOffset || 15);
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [resume, pause, playPrev, playNext, skipBy, seek]);

  // Global Keyboard Shortcuts (Space for play/pause, Left/Right for +/-10s, M for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBy(-15);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipBy(15);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBy, toggleMute]);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    loopMode,
    sleepTimerMinutes,
    sleepTimerRemaining,
    audioVisualizerData,
    playTrack,
    togglePlay,
    pause,
    resume,
    seek,
    skipBy,
    playNext,
    playPrev,
    setVolume,
    toggleMute,
    setPlaybackRate,
    cycleLoopMode,
    setSleepTimer,
  };
}
