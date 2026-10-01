import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Edit2,
  Search,
  FileAudio,
  Check,
  X,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ArrowDownAZ,
  Plus,
} from 'lucide-react';
import { AudioTrack, StorageStats, Grade } from '../types/audio';
import {
  formatTime,
  formatFileSize,
  getTrackPeriod,
  sortTracksByName,
  PeriodKey,
  PERIOD_CONFIG,
} from '../utils/audioUtils';

interface TrackListProps {
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  storageStats: StorageStats;
  selectedGrade?: Grade;
  onPlayTrack: (track: AudioTrack) => void;
  onTogglePlay: () => void;
  onDeleteTrack: (id: string) => void;
  onRenameTrack: (id: string, newTitle: string, newArtist: string) => void;
  onOpenAddModal: (prefillPrefix?: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  selectedGrade = '8',
  onPlayTrack,
  onTogglePlay,
  onDeleteTrack,
  onRenameTrack,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderTab, setActiveFolderTab] = useState<'all' | PeriodKey>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Group tracks into Period 1, Period 2, Period 3, and Other
  const { period1Tracks, period2Tracks, period3Tracks, otherTracks } = useMemo(() => {
    const p1: AudioTrack[] = [];
    const p2: AudioTrack[] = [];
    const p3: AudioTrack[] = [];
    const other: AudioTrack[] = [];

    const query = searchQuery.toLowerCase().trim();

    tracks.forEach((track) => {
      const matchesSearch =
        !query ||
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query);

      if (!matchesSearch) return;

      const period = getTrackPeriod(track.title);
      if (period === 'period1') p1.push(track);
      else if (period === 'period2') p2.push(track);
      else if (period === 'period3') p3.push(track);
      else other.push(track);
    });

    // Always sort by name naturally (1.1.1, 1.1.2, 1.2.1, etc.)
    return {
      period1Tracks: sortTracksByName(p1),
      period2Tracks: sortTracksByName(p2),
      period3Tracks: sortTracksByName(p3),
      otherTracks: sortTracksByName(other),
    };
  }, [tracks, searchQuery]);

  const toggleFolderCollapse = (key: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleStartRename = (track: AudioTrack) => {
    setEditingTrackId(track.id);
    setEditTitle(track.title);
    setEditArtist(track.artist || '');
  };

  const handleSaveRename = (id: string) => {
    onRenameTrack(id, editTitle, editArtist);
    setEditingTrackId(null);
  };

  const periodFolders: Array<{
    key: PeriodKey;
    tracks: AudioTrack[];
    prefixSample: string;
  }> = [
    { key: 'period1', tracks: period1Tracks, prefixSample: '1.1.1 ' },
    { key: 'period2', tracks: period2Tracks, prefixSample: '2.1.1 ' },
    { key: 'period3', tracks: period3Tracks, prefixSample: '3.1.1 ' },
  ];

  if (otherTracks.length > 0) {
    periodFolders.push({ key: 'other', tracks: otherTracks, prefixSample: '' });
  }

  // Filter folders based on activeFolderTab
  const visibleFolders =
    activeFolderTab === 'all'
      ? periodFolders
      : periodFolders.filter((f) => f.key === activeFolderTab);

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Full-width Search Bar & Sort Order Tag */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files by name (e.g. 1.1.1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          className="flex items-center justify-between sm:justify-start gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 font-medium shrink-0"
          title="Files are automatically sorted by name (1.1.1, 1.1.2...)"
        >
          <div className="flex items-center gap-1.5">
            <ArrowDownAZ className="w-4 h-4 text-cyan-400" />
            <span>Sorted by Name</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 font-bold sm:hidden">
            {tracks.length} {tracks.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VERTICAL STACK OF PERIOD FOLDERS - Optimized for portrait mobile screens */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-2">
        {/* All Periods Folder Row */}
        <button
          onClick={() => setActiveFolderTab('all')}
          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFolderTab === 'all'
              ? 'bg-gradient-to-r from-indigo-900/70 to-slate-900 border-indigo-500 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                activeFolderTab === 'all' ? 'bg-indigo-500/25 text-cyan-300' : 'bg-slate-800/80 text-slate-400'
              }`}
            >
              <Folder className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0">
              <span className="font-bold text-sm sm:text-base text-white block truncate">
                All Periods
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                View all Grade {selectedGrade} folders
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ml-2 ${
              activeFolderTab === 'all'
                ? 'bg-indigo-500 text-white shadow'
                : 'bg-slate-800/80 text-slate-400'
            }`}
          >
            {tracks.length} files
          </span>
        </button>

        {/* Period 1, 2, 3 Folder Rows Stacked Vertically */}
        {(['period1', 'period2', 'period3'] as const).map((key) => {
          const count =
            key === 'period1'
              ? period1Tracks.length
              : key === 'period2'
              ? period2Tracks.length
              : period3Tracks.length;
          const config = PERIOD_CONFIG[key];
          const active = activeFolderTab === key;

          return (
            <button
              key={key}
              onClick={() => setActiveFolderTab(key)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-indigo-900/70 to-slate-900 border-cyan-400 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    active ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800/80 text-cyan-400'
                  }`}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white truncate">
                      {config.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                    >
                      {config.patternLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {config.description}
                  </span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ml-2 ${
                  active ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {count} files
              </span>
            </button>
          );
        })}

        {/* Other / Uncategorized Folder (if any files exist) */}
        {otherTracks.length > 0 && (
          <button
            onClick={() => setActiveFolderTab('other')}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeFolderTab === 'other'
                ? 'bg-gradient-to-r from-indigo-900/70 to-slate-900 border-indigo-500 text-white shadow-lg'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900/90 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl shrink-0 bg-slate-800/80 text-slate-400">
                <Folder className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-sm sm:text-base text-white block truncate">
                  Other Audio
                </span>
                <span className="text-[11px] text-slate-400 truncate block">
                  Miscellaneous files
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-400">
              {otherTracks.length} files
            </span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FOLDER CONTENTS & TRACKS LIST - Sorted by Name */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        {visibleFolders.map((folder) => {
          const config = PERIOD_CONFIG[folder.key];
          const isCollapsed = !!collapsedFolders[folder.key];
          const folderTracks = folder.tracks;

          return (
            <div
              key={folder.key}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden transition-all shadow-md"
            >
              {/* Folder Banner Title */}
              <div
                onClick={() => toggleFolderCollapse(folder.key)}
                className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-950/90 hover:bg-slate-900/80 cursor-pointer select-none transition border-b border-slate-800/60"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 text-cyan-400 shrink-0">
                    {isCollapsed ? (
                      <Folder className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                        {config.label}
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                      >
                        {config.patternLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Play folder button */}
                  {folderTracks.length > 0 && (
                    <button
                      onClick={() => onPlayTrack(folderTracks[0])}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-xs font-semibold text-cyan-300 border border-indigo-500/40 cursor-pointer transition"
                      title={`Play all ${config.label} files`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">Play</span>
                    </button>
                  )}

                  {/* Add file directly with prefix */}
                  <button
                    onClick={() => onOpenAddModal(folder.prefixSample)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                    title={`Add audio file to ${config.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleFolderCollapse(folder.key)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Subfolder Contents */}
              {!isCollapsed && (
                <div className="p-2 sm:p-3 space-y-2">
                  {folderTracks.length === 0 ? (
                    <div className="py-6 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800/60 p-4">
                      <FileAudio className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-300">
                        No audio files in {config.label} yet
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto mb-3">
                        Upload or record audio with filename{' '}
                        <strong className="text-cyan-400">{config.patternLabel}</strong>
                      </p>
                      <button
                        onClick={() => onOpenAddModal(folder.prefixSample)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {config.patternLabel} File</span>
                      </button>
                    </div>
                  ) : (
                    folderTracks.map((track) => {
                      const isThisTrackPlaying = isPlaying && currentTrack?.id === track.id;
                      const isThisTrackSelected = currentTrack?.id === track.id;

                      return (
                        <div
                          key={track.id}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isThisTrackSelected
                              ? 'bg-indigo-950/50 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                              : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                          }`}
                        >
                          {/* Left: 1-Tap Big Play Button & Track Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              onClick={() => {
                                if (isThisTrackSelected) {
                                  onTogglePlay();
                                } else {
                                  onPlayTrack(track);
                                }
                              }}
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer shadow-md ${
                                isThisTrackPlaying
                                  ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 ring-2 ring-orange-500/40'
                                  : isThisTrackSelected
                                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                              }`}
                              aria-label={
                                isThisTrackPlaying
                                  ? `Pause ${track.title}`
                                  : `Play ${track.title}`
                              }
                            >
                              {isThisTrackPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current translate-x-0.5" />
                              )}
                            </button>

                            {/* Details or In-Line Rename Mode */}
                            {editingTrackId === track.id ? (
                              <div className="flex-1 space-y-1 pr-2">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="e.g. 1.1.1 Track Name"
                                  className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleSaveRename(track.id)}
                                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" /> Save
                                  </button>
                                  <button
                                    onClick={() => setEditingTrackId(null)}
                                    className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="min-w-0 flex-1">
                                <h5
                                  className={`font-bold text-sm break-words whitespace-normal leading-snug ${
                                    isThisTrackSelected ? 'text-cyan-300' : 'text-white'
                                  }`}
                                >
                                  {track.title}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                                  <span className="font-mono text-cyan-400 font-semibold">
                                    {formatTime(track.duration)}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">
                                    {formatFileSize(track.size)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Action Icons */}
                          {editingTrackId !== track.id && (
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {/* Rename */}
                              <button
                                onClick={() => handleStartRename(track)}
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                                title="Rename file"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete or Confirm Delete */}
                              {confirmDeleteId === track.id ? (
                                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-600/50 p-1 rounded-xl">
                                  <button
                                    onClick={() => {
                                      onDeleteTrack(track.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-500 cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(track.id)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Delete track"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
