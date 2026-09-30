import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Download,
  Edit2,
  Search,
  HardDrive,
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
import { AudioTrack, StorageStats } from '../types/audio';
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
  storageStats,
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

  const handleExportTrack = (track: AudioTrack) => {
    const url = URL.createObjectURL(track.blob);
    const a = document.createElement('a');
    a.href = url;
    const extension = track.mimeType.includes('wav')
      ? '.wav'
      : track.mimeType.includes('mp3')
      ? '.mp3'
      : '.audio';
    a.download = `${track.title}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
      {/* Top Header & Storage Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Offline Audio Library
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold">
              {tracks.length} {tracks.length === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Files organized by Period subfolders and automatically sorted by name.
          </p>
        </div>

        {/* Storage Bar Indicator */}
        <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl min-w-[200px]">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Offline Storage
            </span>
            <span className="font-mono text-cyan-300 font-bold">
              {formatFileSize(storageStats.usedBytes)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
              style={{ width: `${Math.max(5, storageStats.percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subfolder Navigation Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-5">
        {/* Period Subfolder Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveFolderTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeFolderTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>All Periods ({tracks.length})</span>
          </button>

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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Folder className="w-4 h-4 text-cyan-400" />
                <span>
                  {config.label} ({count})
                </span>
              </button>
            );
          })}

          {otherTracks.length > 0 && (
            <button
              onClick={() => setActiveFolderTab('other')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeFolderTab === 'other'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Other ({otherTracks.length})</span>
            </button>
          )}
        </div>

        {/* Search bar & Sort order tag */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-medium shrink-0"
            title="Files are automatically sorted by name (1.1.1, 1.1.2...)"
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sorted by Name</span>
          </div>
        </div>
      </div>

      {/* SUBFOLDERS LIST */}
      <div className="space-y-6">
        {visibleFolders.map((folder) => {
          const config = PERIOD_CONFIG[folder.key];
          const isCollapsed = !!collapsedFolders[folder.key];
          const folderTracks = folder.tracks;

          return (
            <div
              key={folder.key}
              className="rounded-2xl border border-slate-800/80 bg-slate-950/40 overflow-hidden transition-all shadow-md"
            >
              {/* Folder Header Banner */}
              <div
                onClick={() => toggleFolderCollapse(folder.key)}
                className="flex items-center justify-between p-4 bg-slate-950/80 hover:bg-slate-900/60 cursor-pointer select-none transition border-b border-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-cyan-400">
                    {isCollapsed ? (
                      <Folder className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <FolderOpen className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base tracking-tight">
                        {config.label}
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                      >
                        {config.patternLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {folderTracks.length} {folderTracks.length === 1 ? 'file' : 'files'} •{' '}
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Play whole folder button */}
                  {folderTracks.length > 0 && (
                    <button
                      onClick={() => onPlayTrack(folderTracks[0])}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition"
                      title={`Play ${config.label} from start`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                      <span>Play Folder</span>
                    </button>
                  )}

                  {/* Add file directly with folder prefix */}
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
                <div className="p-3 sm:p-4 space-y-2">
                  {folderTracks.length === 0 ? (
                    <div className="py-8 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/60 p-4">
                      <FileAudio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-300">
                        No audio files in {config.label} yet
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto mb-3">
                        Upload or save audio files with name format{' '}
                        <strong className="text-cyan-400">{config.patternLabel}</strong> to
                        automatically store them in this folder.
                      </p>
                      <button
                        onClick={() => onOpenAddModal(folder.prefixSample)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {config.patternLabel} Audio</span>
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
                              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
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
                                <div className="flex items-center gap-2">
                                  <h5
                                    className={`font-bold text-sm truncate ${
                                      isThisTrackSelected ? 'text-cyan-300' : 'text-white'
                                    }`}
                                  >
                                    {track.title}
                                  </h5>
                                </div>
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
                              {/* Export / Download */}
                              <button
                                onClick={() => handleExportTrack(track)}
                                className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                                title="Download audio file to device"
                              >
                                <Download className="w-4 h-4" />
                              </button>

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
