import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllTracks,
  saveMultipleTracks,
  deleteTrack,
  renameTrack,
  getStorageStats,
} from './services/db';
import { AudioTrack, StorageStats, Grade } from './types/audio';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { BigControlsPlayer } from './components/BigControlsPlayer';
import { TrackList } from './components/TrackList';
import { AddAudioModal } from './components/AddAudioModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  generateProceduralSound,
  extractWaveform,
  sortTracksByName,
  getAudioDuration,
  getTrackGrade,
} from './utils/audioUtils';

export default function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade>('8');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialPrefix, setAddModalInitialPrefix] = useState<string>('');
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percentage: 0,
    trackCount: 0,
  });

  // Filter tracks for the currently selected grade
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => getTrackGrade(t) === selectedGrade);
  }, [tracks, selectedGrade]);

  // Audio Player Engine Hook
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playTrack,
    togglePlay,
    seek,
    skipBy,
    playNext,
    playPrev,
    setVolume,
    toggleMute,
  } = useAudioPlayer(tracks);

  // Load tracks from IndexedDB & check for new files from /public/audio/catalog.json
  const refreshTracks = useCallback(async () => {
    try {
      let loadedTracks = await getAllTracks();

      // Check if /public/audio/catalog.json has new curriculum audio files to import
      try {
        const catRes = await fetch('/audio/catalog.json');
        if (catRes.ok) {
          const catalogData = await catRes.json();
          if (catalogData && Array.isArray(catalogData.tracks)) {
            const newlyDiscovered: AudioTrack[] = [];

            for (const item of catalogData.tracks) {
              const alreadyExists = loadedTracks.some(
                (t) => t.id === item.id || t.title === item.title
              );
              if (alreadyExists || !item.url) continue;

              try {
                const audioRes = await fetch(item.url, { method: 'HEAD' });
                if (audioRes.ok) {
                  const fullRes = await fetch(item.url);
                  const blob = await fullRes.blob();
                  const dur = await getAudioDuration(blob);
                  const waveform = await extractWaveform(blob, 48);

                  newlyDiscovered.push({
                    id: item.id || `curriculum_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    title: item.title,
                    artist: item.artist || `Grade ${item.grade || '8'}`,
                    grade: (item.grade as Grade) || '8',
                    duration: dur || 60,
                    size: blob.size,
                    mimeType: blob.type || 'audio/mpeg',
                    blob,
                    addedAt: Date.now(),
                    category: 'sample',
                    waveform,
                  });
                }
              } catch {
                // Audio file not yet on disk
              }
            }

            if (newlyDiscovered.length > 0) {
              await saveMultipleTracks(newlyDiscovered);
              loadedTracks = [...loadedTracks, ...newlyDiscovered];
            }
          }
        }
      } catch {
        // catalog fetch is optional
      }

      // If library is completely empty on first launch, seed Period 1, 2, and 3 audio for Grades 7, 8, 9
      if (loadedTracks.length === 0) {
        try {
          const starterSeeds = [
            // Grade 7 Starter Tracks
            {
              type: 'ambient_rain' as const,
              title: '1.1.1 - Unit 1: Introduction to Grade 7',
              artist: 'Grade 7',
              grade: '7' as Grade,
            },
            {
              type: 'lofi_pulse' as const,
              title: '2.1.1 - Unit 2: Daily Life & Classroom',
              artist: 'Grade 7',
              grade: '7' as Grade,
            },
            {
              type: 'ocean_breeze' as const,
              title: '3.1.1 - Unit 3: Folk Tales & Nature',
              artist: 'Grade 7',
              grade: '7' as Grade,
            },
            // Grade 8 Starter Tracks
            {
              type: 'ambient_rain' as const,
              title: '1.1.1 - Unit 1: Greetings & Introductions',
              artist: 'Grade 8',
              grade: '8' as Grade,
            },
            {
              type: 'lofi_pulse' as const,
              title: '1.1.2 - Unit 1: Listening Dialogue',
              artist: 'Grade 8',
              grade: '8' as Grade,
            },
            {
              type: 'binaural_meditation' as const,
              title: '2.1.1 - Unit 2: School Life & Routines',
              artist: 'Grade 8',
              grade: '8' as Grade,
            },
            {
              type: 'ocean_breeze' as const,
              title: '3.1.1 - Unit 3: Environmental Stories',
              artist: 'Grade 8',
              grade: '8' as Grade,
            },
            // Grade 9 Starter Tracks
            {
              type: 'ambient_rain' as const,
              title: '1.1.1 - Unit 1: Perspectives & Debates',
              artist: 'Grade 9',
              grade: '9' as Grade,
            },
            {
              type: 'binaural_meditation' as const,
              title: '2.1.1 - Unit 2: Global Communities',
              artist: 'Grade 9',
              grade: '9' as Grade,
            },
            {
              type: 'lofi_pulse' as const,
              title: '3.1.1 - Unit 3: Graduation & Future Aspirations',
              artist: 'Grade 9',
              grade: '9' as Grade,
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
              grade: seed.grade,
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

      // Auto-load first track of default grade if none selected yet
      if (!currentTrack && sorted.length > 0) {
        const defaultGradeTracks = sorted.filter((t) => getTrackGrade(t) === '8');
        playTrack(defaultGradeTracks[0] || sorted[0], false);
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
          {/* Brand: Clean EnglishPractice title & Grade 7, 8, 9 Navigator */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
              EnglishPractice
            </h1>

            {/* Grade Navigator: 7, 8, 9 */}
            <div className="flex items-center gap-1.5 mt-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-fit">
              <span className="text-[11px] font-semibold text-slate-400 pl-1.5 pr-0.5 uppercase tracking-wider">
                Grade
              </span>
              {(['7', '8', '9'] as const).map((grade) => {
                const isSelected = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    aria-label={`Select Grade ${grade}`}
                    title={`Switch to Grade ${grade} Audio`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install PWA Button (Handles Chrome / Android / iOS) */}
            <PWAInstallButton />
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

        {/* OFFLINE LIBRARY SECTION - Subfolders for Period 1, Period 2, Period 3 for Selected Grade */}
        <section aria-label="Offline Audio Tracks Library">
          <TrackList
            tracks={filteredTracks}
            selectedGrade={selectedGrade}
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
          <p>© {new Date().getFullYear()} EnglishPractice • Offline Audio Player</p>
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
        selectedGrade={selectedGrade}
        initialPrefix={addModalInitialPrefix}
        onClose={() => setIsAddModalOpen(false)}
        onTrackAdded={handleTrackAdded}
        onMultipleTracksAdded={handleMultipleTracksAdded}
      />
    </div>
  );
}
