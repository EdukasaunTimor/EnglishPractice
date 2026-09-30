import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Mic,
  Music,
  Square,
  Sparkles,
  Loader2,
  FileCheck,
  Disc,
  Folder,
} from 'lucide-react';
import { AudioTrack } from '../types/audio';
import {
  getAudioDuration,
  extractWaveform,
  generateProceduralSound,
  SampleSoundType,
} from '../utils/audioUtils';

interface AddAudioModalProps {
  isOpen: boolean;
  initialPrefix?: string;
  onClose: () => void;
  onTrackAdded: (track: AudioTrack) => void;
  onMultipleTracksAdded: (tracks: AudioTrack[]) => void;
}

export const AddAudioModal: React.FC<AddAudioModalProps> = ({
  isOpen,
  initialPrefix = '',
  onClose,
  onTrackAdded,
  onMultipleTracksAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sample' | 'record'>('upload');
  const [targetPeriod, setTargetPeriod] = useState<'auto' | '1' | '2' | '3'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialPrefix) {
      if (initialPrefix.startsWith('1.')) setTargetPeriod('1');
      else if (initialPrefix.startsWith('2.')) setTargetPeriod('2');
      else if (initialPrefix.startsWith('3.')) setTargetPeriod('3');
      setRecordingTitle(initialPrefix + 'Recording');
    } else {
      setRecordingTitle('1.1.1 - Voice Memo');
    }
  }, [initialPrefix, isOpen]);

  if (!isOpen) return null;

  // Process uploaded files
  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const newTracks: AudioTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
        continue;
      }

      setProcessStatus(`Reading "${file.name}"... (${i + 1}/${files.length})`);

      try {
        const duration = await getAudioDuration(file);
        const waveform = await extractWaveform(file, 48);

        // Derive artist and title from filename
        let cleanName = file.name.replace(/\.[^/.]+$/, '').trim();

        // If targetPeriod is explicitly 1, 2, or 3 and filename doesn't start with it, prepend it
        if (targetPeriod === '1' && !/^1\./.test(cleanName)) {
          cleanName = `1.1.${i + 1} - ${cleanName}`;
        } else if (targetPeriod === '2' && !/^2\./.test(cleanName)) {
          cleanName = `2.1.${i + 1} - ${cleanName}`;
        } else if (targetPeriod === '3' && !/^3\./.test(cleanName)) {
          cleanName = `3.1.${i + 1} - ${cleanName}`;
        }

        let title = cleanName;
        let artist = 'English Grade 8';

        if (cleanName.includes(' - ')) {
          const parts = cleanName.split(' - ');
          if (/^[123]\./.test(parts[0])) {
            title = cleanName;
            artist = parts.length > 2 ? parts[parts.length - 1] : 'English Grade 8';
          } else {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }
        }

        const newTrack: AudioTrack = {
          id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title,
          artist,
          duration: duration || 60,
          size: file.size,
          mimeType: file.type || 'audio/mpeg',
          blob: file,
          addedAt: Date.now() + i,
          category: 'upload',
          waveform,
        };

        newTracks.push(newTrack);
      } catch (err) {
        console.error('Error processing audio file:', err);
      }
    }

    if (newTracks.length > 0) {
      if (newTracks.length === 1) {
        onTrackAdded(newTracks[0]);
      } else {
        onMultipleTracksAdded(newTracks);
      }
      setIsProcessing(false);
      onClose();
    } else {
      setIsProcessing(false);
      setProcessStatus('No valid audio files found.');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Sound generator
  const handleGenerateSample = async (type: SampleSoundType, periodNum: string, defaultName: string) => {
    setIsProcessing(true);
    setProcessStatus(`Generating ${periodNum}.x sound sample...`);

    try {
      const sample = await generateProceduralSound(type, 15);
      const waveform = await extractWaveform(sample.blob, 48);

      const track: AudioTrack = {
        id: `sample_${Date.now()}`,
        title: `${periodNum}.1.1 - ${defaultName}`,
        artist: `Period ${periodNum} • English Grade 8`,
        duration: sample.duration,
        size: sample.blob.size,
        mimeType: sample.blob.type,
        blob: sample.blob,
        addedAt: Date.now(),
        category: 'sample',
        waveform,
      };

      onTrackAdded(track);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error('Error generating audio:', err);
      setIsProcessing(false);
      setProcessStatus('Error generating sound');
    }
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access is required to record audio notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const saveRecordedMemo = async () => {
    if (!recordedBlob) return;
    setIsProcessing(true);
    setProcessStatus('Saving voice recording to offline storage...');

    try {
      const duration = recordingSeconds || (await getAudioDuration(recordedBlob));
      const waveform = await extractWaveform(recordedBlob, 48);

      let title = recordingTitle.trim();
      if (!title) {
        title = targetPeriod !== 'auto' ? `${targetPeriod}.1.1 - Voice Memo` : '1.1.1 - Voice Memo';
      }

      const track: AudioTrack = {
        id: `recording_${Date.now()}`,
        title,
        artist: 'Class Recording',
        duration: Math.max(1, duration),
        size: recordedBlob.size,
        mimeType: recordedBlob.type || 'audio/webm',
        blob: recordedBlob,
        addedAt: Date.now(),
        category: 'recording',
        waveform,
      };

      onTrackAdded(track);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error('Error saving recording:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-400">
              <Disc className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Add Audio to SoundBank
              </h3>
              <p className="text-xs text-slate-400">
                Saves offline to Period 1, 2, or 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Folder Assignment Selector */}
        <div className="my-4 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Target Folder:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'auto', label: 'Auto (from name)' },
              { id: '1', label: 'Period 1 (1.x.x)' },
              { id: '2', label: 'Period 2 (2.x.x)' },
              { id: '3', label: 'Period 3 (3.x.x)' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTargetPeriod(p.id as 'auto' | '1' | '2' | '3');
                  if (p.id !== 'auto') {
                    setRecordingTitle(`${p.id}.1.1 - Voice Memo`);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  targetPeriod === p.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mb-4 p-1 bg-slate-950 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'sample'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Curriculum Sounds</span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'record'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voice Memo</span>
          </button>
        </div>

        {/* Loading overlay */}
        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-white">{processStatus || 'Processing audio file...'}</p>
            <p className="text-xs text-slate-400 mt-1">Sorting by name into Period subfolders</p>
          </div>
        )}

        {!isProcessing && (
          <div className="overflow-y-auto flex-1 pr-1">
            {/* Tab 1: Upload Files */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                      : 'border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-950/80'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        processFiles(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-cyan-400 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Choose Audio Files or Drag &amp; Drop
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Files named <strong className="text-cyan-400">1.x.x</strong> go to Period 1, <strong className="text-cyan-400">2.x.x</strong> to Period 2, and <strong className="text-cyan-400">3.x.x</strong> to Period 3.
                  </p>
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 pointer-events-none"
                  >
                    Select Audio Files
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Curriculum Sounds for Period 1, 2, 3 */}
            {activeTab === 'sample' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  Add sample lesson audio directly into Period 1, 2, or 3. No internet required.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      period: '1',
                      type: 'ambient_rain' as const,
                      title: '1.2.1 - Unit 1: Listening Dialogue',
                      desc: 'Classroom dialogue & greeting practice',
                      color: 'from-blue-600/30 to-indigo-600/30 border-blue-500/40',
                    },
                    {
                      period: '1',
                      type: 'lofi_pulse' as const,
                      title: '1.2.2 - Unit 1: Vocabulary Rhythm',
                      desc: 'Spelling & word pronunciation groove',
                      color: 'from-blue-600/30 to-cyan-600/30 border-blue-500/40',
                    },
                    {
                      period: '2',
                      type: 'binaural_meditation' as const,
                      title: '2.1.2 - Unit 2: School Routine Listening',
                      desc: 'Period 2 comprehension exercise',
                      color: 'from-emerald-600/30 to-teal-600/30 border-emerald-500/40',
                    },
                    {
                      period: '3',
                      type: 'ocean_breeze' as const,
                      title: '3.1.2 - Unit 3: Environmental Story',
                      desc: 'Period 3 nature & science reading',
                      color: 'from-purple-600/30 to-pink-600/30 border-purple-500/40',
                    },
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGenerateSample(s.type, s.period, s.title.replace(/^[123]\.\d+\.\d+\s*-\s*/, ''))}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${s.color} border text-left hover:scale-[1.02] active:scale-98 transition cursor-pointer flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Music className="w-5 h-5 text-cyan-300" />
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/60 text-slate-300">
                            Period {s.period}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm leading-tight">{s.title}</h4>
                        <p className="text-xs text-slate-300/80 mt-1">{s.desc}</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Add to Period {s.period}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Record Voice Memo */}
            {activeTab === 'record' && (
              <div className="text-center py-4 space-y-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-rose-600/30 text-rose-400 border-2 border-rose-500 ring-8 ring-rose-500/20 animate-pulse'
                        : recordedBlob
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Mic className="w-10 h-10" />
                  </div>

                  <div className="mt-4 font-mono text-2xl font-bold text-white">
                    {Math.floor(recordingSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    {isRecording
                      ? 'Recording in progress... Speak clearly'
                      : recordedBlob
                      ? 'Recording complete! Verify the title with 1.x.x, 2.x.x, or 3.x.x.'
                      : 'Record an oral exam or voice note for your period folders.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-rose-600/30 active:scale-95 transition cursor-pointer"
                    >
                      <Mic className="w-5 h-5" />
                      <span>{recordedBlob ? 'Record Again' : 'Start Recording'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-2xl border border-rose-500/40 active:scale-95 transition cursor-pointer"
                    >
                      <Square className="w-5 h-5 text-rose-400 fill-current" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>

                {recordedBlob && !isRecording && (
                  <div className="pt-4 border-t border-slate-800 text-left space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Recording Title (e.g. 1.1.3 Listening Task)
                      </label>
                      <input
                        type="text"
                        placeholder="1.1.1 - Reading Passage"
                        value={recordingTitle}
                        onChange={(e) => setRecordingTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <button
                      onClick={saveRecordedMemo}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer text-sm"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Save into Period Subfolder</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
