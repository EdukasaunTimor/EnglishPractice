import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllTracks,
  saveMultipleTracks,
  deleteTrack,
  renameTrack,
  getStorageStats,
} from './services/db';
import { AudioTrack, StorageStats } from './types/audio';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { BigControlsPlayer } from './components/BigControlsPlayer';
import { TrackList } from './components/TrackList';
import { AddAudioModal } from './components/AddAudioModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Plus,
  Radio,
  HelpCircle,
  X,
  Keyboard,
} from 'lucide-react';
import { generateProceduralSound, extractWaveform, sortTracksByName } from './utils/audioUtils';

export default function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialPrefix, setAddModalInitialPrefix] = useState<string>('');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percentage: 0,
    trackCount: 0,
  });

  // Audio Player Engine Hook
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    audioVisualizerData,
    playTrack,
    togglePlay,
    seek,
    skipBy,
    playNext,
    playPrev,
    setVolume,
    toggleMute,
  } = useAudioPlayer(tracks);

  // Load tracks from IndexedDB and seed Period 1, 2, 3 starter tracks if empty
  const refreshTracks = useCallback(async () => {
    try {
      let loadedTracks = await getAllTracks();

      // If library is completely empty on first launch, seed Period 1, 2, and 3 audio
      if (loadedTracks.length === 0) {
        try {
          const starterSeeds = [
            {
              type: 'ambient_rain' as const,
              title: '1.1.1 - Unit 1: Introduction & Greetings',
              artist: 'Period 1 • English Grade 8',
            },
            {
              type: 'lofi_pulse' as const,
              title: '1.1.2 - Unit 1: Listening Dialogue',
              artist: 'Period 1 • English Grade 8',
            },
            {
              type: 'binaural_meditation' as const,
              title: '2.1.1 - Unit 2: School Life & Daily Routines',
              artist: 'Period 2 • English Grade 8',
            },
            {
              type: 'ocean_breeze' as const,
              title: '3.1.1 - Unit 3: Environmental Stories',
              artist: 'Period 3 • English Grade 8',
            },
          ];

          const seededTracks: AudioTrack[] = [];

          for (let i = 0; i < starterSeeds.length; i++) {
            const seed = starterSeeds[i];
            const sample = await generateProceduralSound(seed.type, 15);
            const waveform = await extractWaveform(sample.blob, 48);

            seededTracks.push({
              id: `seed_track_${Date.now()}_${i}`,
              title: seed.title,
              artist: seed.artist,
              duration: sample.duration,
              size: sample.blob.size,
              mimeType: sample.blob.type,
              blob: sample.blob,
              addedAt: Date.now() + i,
              category: 'sample',
              waveform,
            });
          }

          await saveMultipleTracks(seededTracks);
          loadedTracks = seededTracks;
        } catch (err) {
          console.error('Starter audio seed error:', err);
        }
      }

      // Keep sorted by name
      const sorted = sortTracksByName(loadedTracks);
      setTracks(sorted);

      const stats = await getStorageStats(sorted);
      setStorageStats(stats);

      // Auto-load first track if none selected yet
      if (!currentTrack && sorted.length > 0) {
        playTrack(sorted[0], false);
      }
    } catch (err) {
      console.error('Failed to load tracks from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack, playTrack]);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  // Track addition handlers
  const handleTrackAdded = async (newTrack: AudioTrack) => {
    await saveMultipleTracks([newTrack]);
    await refreshTracks();
    playTrack(newTrack);
  };

  const handleMultipleTracksAdded = async (newTracks: AudioTrack[]) => {
    await saveMultipleTracks(newTracks);
    await refreshTracks();
    if (newTracks.length > 0) {
      playTrack(newTracks[0]);
    }
  };

  // Delete track handler
  const handleDeleteTrack = async (id: string) => {
    await deleteTrack(id);
    await refreshTracks();
    if (currentTrack?.id === id) {
      const remaining = tracks.filter((t) => t.id !== id);
      if (remaining.length > 0) {
        playTrack(remaining[0], false);
      }
    }
  };

  // Rename track handler
  const handleRenameTrack = async (id: string, newTitle: string, newArtist: string) => {
    await renameTrack(id, newTitle, newArtist);
    await refreshTracks();
  };

  const handleOpenAddModal = (prefix = '') => {
    setAddModalInitialPrefix(prefix);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* PWA Offline Banner Indicator */}
      <OfflineIndicator />

      {/* App Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand: Renamed to SoundBank */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                  SoundBank
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">English Grade 8 • Offline Audio</p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install PWA Button (Handles Chrome / Android / iOS) */}
            <PWAInstallButton />

            {/* Keyboard Shortcuts Help */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Keyboard & Touch Shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Add Audio Primary Button */}
            <button
              onClick={() => handleOpenAddModal('')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Audio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* PRIMARY PLAYER SECTION - Big Buttons for Play & Pause */}
        <section aria-label="Main Audio Player">
          <BigControlsPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            audioVisualizerData={audioVisualizerData}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onSkipBy={skipBy}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onVolumeChange={setVolume}
            onToggleMute={toggleMute}
            onOpenAddModal={() => handleOpenAddModal('')}
          />
        </section>

        {/* OFFLINE LIBRARY SECTION - Subfolders for Period 1, Period 2, Period 3 */}
        <section aria-label="Offline Audio Tracks Library">
          <TrackList
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            storageStats={storageStats}
            onPlayTrack={(track) => playTrack(track, true)}
            onTogglePlay={togglePlay}
            onDeleteTrack={handleDeleteTrack}
            onRenameTrack={handleRenameTrack}
            onOpenAddModal={(prefix) => handleOpenAddModal(prefix)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SoundBank • English Grade 8 Offline Audio Player</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Period 1 (1.x.x)</span>
            <span>•</span>
            <span>Period 2 (2.x.x)</span>
            <span>•</span>
            <span>Period 3 (3.x.x)</span>
          </div>
        </div>
      </footer>

      {/* Modal: Add Offline Audio */}
      <AddAudioModal
        isOpen={isAddModalOpen}
        initialPrefix={addModalInitialPrefix}
        onClose={() => setIsAddModalOpen(false)}
        onTrackAdded={handleTrackAdded}
        onMultipleTracksAdded={handleMultipleTracksAdded}
      />

      {/* Modal: Shortcuts & Accessibility Guide */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                Player Controls &amp; Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Play / Pause</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Rewind 15 seconds</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs">
                  ← (Left Arrow)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Skip forward 15 seconds</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs">
                  → (Right Arrow)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Mute / Unmute Volume</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs">
                  M
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Lockscreen / Headphone Buttons</span>
                <span className="text-emerald-400 font-semibold text-xs">Supported (MediaSession)</span>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="mt-6 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
