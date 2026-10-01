export type Grade = '7' | '8' | '9';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  grade?: Grade;
  duration: number; // in seconds
  size: number; // in bytes
  mimeType: string;
  blob: Blob;
  addedAt: number;
  category: 'upload' | 'sample' | 'recording';
  lastPlayedPosition?: number;
  waveform?: number[]; // normalized 0-1 values for visualizer
}

export type LoopMode = 'off' | 'all' | 'one';

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  trackCount: number;
}
