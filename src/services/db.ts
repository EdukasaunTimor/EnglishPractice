import { AudioTrack, StorageStats } from '../types/audio';

const DB_NAME = 'soundvault_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllTracks(): Promise<AudioTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const tracks = (request.result as AudioTrack[]).sort((a, b) => b.addedAt - a.addedAt);
      resolve(tracks);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getTrackById(id: string): Promise<AudioTrack | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as AudioTrack | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track: AudioTrack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(track);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveMultipleTracks(tracks: AudioTrack[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const track of tracks) {
      store.put(track);
    }
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateTrackPosition(id: string, position: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const track = getReq.result as AudioTrack | undefined;
      if (track) {
        track.lastPlayedPosition = position;
        store.put(track);
      }
      resolve();
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function renameTrack(id: string, newTitle: string, newArtist: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const track = getReq.result as AudioTrack | undefined;
      if (track) {
        track.title = newTitle.trim() || track.title;
        track.artist = newArtist.trim() || track.artist;
        store.put(track);
      }
      resolve();
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getStorageStats(tracks: AudioTrack[]): Promise<StorageStats> {
  let usedBytes = tracks.reduce((acc, t) => acc + (t.size || 0), 0);
  let quotaBytes = 1024 * 1024 * 1024; // fallback 1GB

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined) {
        usedBytes = Math.max(usedBytes, estimate.usage);
      }
      if (estimate.quota !== undefined && estimate.quota > 0) {
        quotaBytes = estimate.quota;
      }
    } catch {
      // fallback estimate
    }
  }

  const percentage = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

  return {
    usedBytes,
    quotaBytes,
    percentage,
    trackCount: tracks.length,
  };
}
