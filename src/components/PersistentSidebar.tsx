import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Sparkles, 
  Wrench, 
  Terminal, 
  FileDown, 
  Layers, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  ShieldAlert, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  GitBranch, 
  FileCode2,
  Bookmark,
  Pin,
  ExternalLink,
  Undo2,
  Redo2,
  History,
  Save,
  RotateCcw as RestoreIcon
} from 'lucide-react';
import { ParsedSessionState, ValidationResult, TaskStatus } from '../types/zlce';
import { serializeSessionStateToMarkdown, parseSessionStateMarkdown } from '../utils/markdownParser';
import { SessionSnapshot } from '../hooks/useSessionPersistence';
import { generateUUIDv4 } from '../utils/uuid';
import { copyText } from '../utils/clipboard';



interface PersistentSidebarProps {
  rawMarkdown: string;
  onUpdateMarkdown: (newMd: string) => void;
  stateData: ParsedSessionState;
  onUpdateStateData: (newData: ParsedSessionState) => void;
  validation: ValidationResult;
  onRunLinter: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  persistence?: {
    lastSaved: Date | null;
    isSaved: boolean;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => boolean;
    redo: () => boolean;
    restoreFromStorage: () => boolean;
    restoreSnapshot: (snapshotId: string) => boolean;
    resetToDefault: () => void;
    createManualSnapshot: (label?: string) => void;
    clearStorage: () => void;
    hasStoredSession: boolean;
    history: SessionSnapshot[];
    historyIndex: number;
  };
}

export const PersistentSidebar: React.FC<PersistentSidebarProps> = ({
  rawMarkdown,
  onUpdateMarkdown,
  stateData,
  onUpdateStateData,
  validation,
  onRunLinter,
  onToggleFullscreen,
  isFullscreen,
  persistence
}) => {
  // Sidebar open/collapse state (saved in localStorage for persistence)
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zlce_sidebar_open');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Current UUID generated
  const [currentUUID, setCurrentUUID] = useState<string>('');
  const [uuidType, setUuidType] = useState<'v4' | 'short' | 'task'>('v4');
  const [uuidCopied, setUuidCopied] = useState<boolean>(false);
  const [recentUUIDs, setRecentUUIDs] = useState<string[]>([]);

  // Timestamp format state
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<'x1' | 'iso_utc' | 'iso_local' | 'wib'>('x1');
  const [timestampCopied, setTimestampCopied] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // General feedback toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'quick' | 'snippets' | 'audit'>('quick');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const toggleSidebar = () => {
    setIsOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('zlce_sidebar_open', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Generate UUID based on selected type
  const handleGenerateUUID = () => {
    let generated = '';
    if (uuidType === 'v4') {
      generated = generateUUIDv4();
    } else if (uuidType === 'short') {
      generated = generateUUIDv4().split('-')[0];
    } else if (uuidType === 'task') {
      const nextNum = (stateData.tasks?.length || 0) + 1;
      generated = `TASK-${String(nextNum).padStart(3, '0')}`;
    }

    setCurrentUUID(generated);
    setRecentUUIDs(prev => [generated, ...prev.filter(item => item !== generated)].slice(0, 5));
    copyText(generated).then(success => {
      if (success) {
        setUuidCopied(true);
        triggerToast(`UUID dihasilkan & disalin: ${generated}`);
        setTimeout(() => setUuidCopied(false), 2000);
      }
    });
  };

  // Initial UUID generation on mount if empty
  useEffect(() => {
    if (!currentUUID) {
      const initId = generateUUIDv4();
      setCurrentUUID(initId);
      setRecentUUIDs([initId]);
    }
  }, []);

  // Live clock updater for previewing timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (selectedTimeFormat === 'x1') {
        const today = now.toISOString().slice(0, 10);
        setCurrentTimeStr(`${today} jam: ?`);
      } else if (selectedTimeFormat === 'iso_utc') {
        setCurrentTimeStr(now.toISOString());
      } else if (selectedTimeFormat === 'iso_local') {
        // Format ISO with local timezone offset
        const offset = -now.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
        const offsetStr = `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19) + offsetStr;
        setCurrentTimeStr(localIso);
      } else if (selectedTimeFormat === 'wib') {
        const opts: Intl.DateTimeFormatOptions = {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        setCurrentTimeStr(`${now.toLocaleDateString('id-ID', opts)} WIB`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimeFormat]);

  // Insert UUID into Raw Markdown (appends to bottom or audit log)
  const handleInsertUUIDToMarkdown = () => {
    if (!currentUUID) return;
    const addition = `\n<!-- Generated UUID: ${currentUUID} -->\n`;
    const updatedMd = rawMarkdown + addition;
    onUpdateMarkdown(updatedMd);
    triggerToast(`UUID disisipkan ke SESSION_STATE.md`);
  };

  // Copy Timestamp
  const handleCopyTimestamp = async () => {
    const success = await copyText(currentTimeStr);
    if (success) {
      setTimestampCopied(true);
      triggerToast(`Timestamp disalin: ${currentTimeStr}`);
      setTimeout(() => setTimestampCopied(false), 2000);
    }
  };

  // Direct Update Timestamp into WAL & Status Audit
  const handleApplyTimestampToWAL = () => {
    const stamp = currentTimeStr;
    const updatedStatus = { ...stateData.status, timestampAudit: stamp };
    const updatedWal = { ...stateData.wal, updatedTimestamp: stamp };
    const updatedState: ParsedSessionState = {
      ...stateData,
      status: updatedStatus,
      wal: updatedWal
    };

    const newMd = serializeSessionStateToMarkdown(updatedState);
    updatedState.raw = newMd;
    onUpdateStateData(updatedState);
    onUpdateMarkdown(newMd);
    triggerToast(`Timestamp WAL & Status diperbarui ke "${stamp}"`);
  };

  // Insert a new blank task to Task Matrix
  const handleInsertNewTask = () => {
    const nextNum = (stateData.tasks?.length || 0) + 1;
    const formattedId = `TASK-${String(nextNum).padStart(3, '0')}`;
    const newTask = {
      id: formattedId,
      name: 'Task Baru (Operasi Cepat)',
      dependencies: stateData.tasks && stateData.tasks.length > 0 ? stateData.tasks[stateData.tasks.length - 1].id : '-',
      status: 'PENDING' as TaskStatus,
      evidence: '-',
      approved: '-'
    };

    const updatedTasks = [...(stateData.tasks || []), newTask];
    const updatedState = { ...stateData, tasks: updatedTasks };
    const newMd = serializeSessionStateToMarkdown(updatedState);
    updatedState.raw = newMd;
    onUpdateStateData(updatedState);
    onUpdateMarkdown(newMd);
    triggerToast(`Baris ${formattedId} ditambahkan ke Matriks Task`);
  };

  // Copy Entire SESSION_STATE.md
  const handleCopyAllMarkdown = async () => {
    const success = await copyText(rawMarkdown);
    if (success) {
      triggerToast('Seluruh SESSION_STATE.md berhasil disalin!');
    }
  };

  // Download SESSION_STATE.md
  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([rawMarkdown], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'SESSION_STATE.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    triggerToast('SESSION_STATE.md berhasil diunduh!');
  };

  // Quick Git Tag Command Copy
  const handleCopyGitTag = async (gate: string) => {
    const cmd = `git tag -a ${gate} -m "Approved by User" && git push origin ${gate}`;
    const success = await copyText(cmd);
    if (success) {
      triggerToast(`Command Git Tag disalin: ${gate}`);
    }
  };

  // If fullscreen editor is active, don't overlap it with the sidebar
  if (isFullscreen) {
    return null;
  }

  return (
    <>
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-950 border border-cyan-500/80 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-bounce backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Toggle Pill when collapsed */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed right-0 top-1/3 z-40 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border-l border-y border-cyan-500/40 p-2.5 rounded-l-xl shadow-2xl flex flex-col items-center gap-1.5 transition-all hover:pr-4 group"
          title="Buka ZLCE Quick Ops Sidebar"
        >
          <div className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] text-slate-300 py-1 font-mono">
            ZLCE OPS
          </span>
          {validation.valid ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Linter OK" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" title="Linter Error" />
          )}
        </button>
      )}

      {/* Persistent Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-40 w-80 sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-md flex flex-col transform transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Bar */}
        <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  ZLCE Quick Ops
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  v3.2.2
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pintasan deterministik & operasi instan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse toggle */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Tutup Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 text-[11px] font-medium text-slate-400">
          <button
            onClick={() => setActiveSubTab('quick')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeSubTab === 'quick'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Operasi Utama
          </button>
          <button
            onClick={() => setActiveSubTab('snippets')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeSubTab === 'snippets'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Snippet ZLCE
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeSubTab === 'audit'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Status & Lint
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
          {activeSubTab === 'quick' && (
            <>
              {/* OPERATION 1: TOGGLE FULLSCREEN EDITOR (FEATURE REQUESTED) */}
              <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900 p-3.5 rounded-xl border border-cyan-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Editor
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Distraction-Free</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Buka editor layar penuh untuk menyunting <code>SESSION_STATE.md</code> dengan live split preview & verifikasi instan.
                </p>
                <button
                  onClick={onToggleFullscreen}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition shadow-md shadow-cyan-900/20 active:scale-[0.98]"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Toggle Fullscreen Editor</span>
                </button>
              </div>

              {/* OPERATION 2: UNDO / RESTORE & LOCALSTORAGE PERSISTENCE (FEATURE REQUESTED) */}
              {persistence && (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5 text-emerald-400" /> Sesi & Undo / Restore
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${persistence.isSaved ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                      {persistence.isSaved ? 'Auto-Saved' : 'Menyimpan...'}
                    </span>
                  </div>

                  {/* Persistence Status Info */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Waktu Simpan:</span>
                      <span className="text-slate-200">
                        {persistence.lastSaved ? persistence.lastSaved.toLocaleTimeString('id-ID') : 'Sesi Baru'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Riwayat Snapshot:</span>
                      <span className="text-cyan-400">
                        {persistence.historyIndex + 1} / {persistence.history.length} checkpoint
                      </span>
                    </div>
                  </div>

                  {/* Primary Undo / Redo Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const ok = persistence.undo();
                        if (ok) triggerToast('Undo: Berhasil mundur ke checkpoint sebelumnya (Ctrl+Z)');
                      }}
                      disabled={!persistence.canUndo}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition border ${
                        persistence.canUndo
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 active:scale-95'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                      title="Undo Perubahan (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Undo</span>
                      {persistence.canUndo && (
                        <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                          {persistence.historyIndex}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const ok = persistence.redo();
                        if (ok) triggerToast('Redo: Berhasil maju ke checkpoint berikutnya (Ctrl+Y)');
                      }}
                      disabled={!persistence.canRedo}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition border ${
                        persistence.canRedo
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 active:scale-95'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                      title="Redo Perubahan (Ctrl+Y)"
                    >
                      <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Redo</span>
                      {persistence.canRedo && (
                        <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                          {persistence.history.length - 1 - persistence.historyIndex}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Restore from Storage & Create Checkpoint */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const ok = persistence.restoreFromStorage();
                        if (ok) {
                          triggerToast('Sesi berhasil dipulihkan dari LocalStorage!');
                        } else {
                          triggerToast('Tidak ada data sesi tersimpan di LocalStorage');
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/70 text-xs font-medium transition active:scale-95"
                      title="Pulihkan data sesi tersimpan dari LocalStorage"
                    >
                      <RestoreIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Restore Storage</span>
                    </button>

                    <button
                      onClick={() => {
                        persistence.createManualSnapshot();
                        triggerToast('Checkpoint manual berhasil disimpan!');
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 text-xs font-medium transition active:scale-95"
                      title="Simpan checkpoint snapshot manual saat ini"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Checkpoint</span>
                    </button>
                  </div>

                  {/* Toggle Snapshot History List */}
                  <button
                    onClick={() => setShowHistoryDrawer(prev => !prev)}
                    className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-850 text-slate-300 text-[11px] font-mono border border-slate-800 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>Daftar Riwayat ({persistence.history.length})</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">
                      {showHistoryDrawer ? 'Tutup ▲' : 'Buka ▼'}
                    </span>
                  </button>

                  {/* Expandable History Drawer */}
                  {showHistoryDrawer && (
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                      <div className="text-[10px] font-mono text-slate-400 px-1 flex justify-between">
                        <span>PILIH CHECKPOINT:</span>
                        <button
                          onClick={() => {
                            if (confirm('Revert ke Template Awal? Perubahan saat ini akan di-reset.')) {
                              persistence.resetToDefault();
                              triggerToast('Template di-reset ke nilai default awal!');
                            }
                          }}
                          className="text-rose-400 hover:text-rose-300 text-[10px]"
                        >
                          Reset Default
                        </button>
                      </div>
                      {persistence.history.map((snap, idx) => {
                        const isActive = idx === persistence.historyIndex;
                        return (
                          <div
                            key={snap.id}
                            className={`p-2 rounded flex items-center justify-between text-xs transition border ${
                              isActive
                                ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-200'
                                : 'bg-slate-950/60 border-slate-850 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-[11px] truncate flex items-center gap-1.5">
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                                <span>{snap.label}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {new Date(snap.timestamp).toLocaleTimeString('id-ID')}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                persistence.restoreSnapshot(snap.id);
                                triggerToast(`Dipulihkan ke: ${snap.label}`);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-mono shrink-0 transition ${
                                isActive
                                  ? 'bg-cyan-600 text-white font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isActive ? 'Aktif' : 'Pulihkan'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* OPERATION 3: GENERATE NEW UUID (FEATURE REQUESTED) */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" /> Generate New UUID
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">Crypto RFC4122</span>
                </div>

                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <button
                    onClick={() => setUuidType('v4')}
                    className={`py-1 rounded text-center transition ${
                      uuidType === 'v4' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    UUID v4
                  </button>
                  <button
                    onClick={() => setUuidType('short')}
                    className={`py-1 rounded text-center transition ${
                      uuidType === 'short' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Short (8c)
                  </button>
                  <button
                    onClick={() => setUuidType('task')}
                    className={`py-1 rounded text-center transition ${
                      uuidType === 'task' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Task ID
                  </button>
                </div>

                {/* Current UUID Output Card */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Hasil Generate:</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Siap Pakai</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80 font-mono text-xs text-cyan-300 break-all select-all">
                    {currentUUID || 'Klik tombol di bawah'}
                  </div>
                </div>

                {/* Buttons for UUID */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleGenerateUUID}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs transition border border-slate-700 active:scale-[0.98]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Generate Baru</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (currentUUID) {
                        const success = await copyText(currentUUID);
                        if (success) {
                          setUuidCopied(true);
                          triggerToast(`UUID disalin: ${currentUUID}`);
                          setTimeout(() => setUuidCopied(false), 2000);
                        }
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-700/60 font-medium text-xs transition active:scale-[0.98]"
                  >
                    {uuidCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{uuidCopied ? 'Tersalin' : 'Salin UUID'}</span>
                  </button>
                </div>

                {/* Option to Append to Markdown */}
                <button
                  onClick={handleInsertUUIDToMarkdown}
                  className="w-full text-[11px] text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-1 py-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Sisipkan anotasi UUID ke Markdown</span>
                </button>

                {/* Recent UUIDs history */}
                {recentUUIDs.length > 1 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono">Riwayat Terakhir (Klik untuk salin):</span>
                    <div className="space-y-1">
                      {recentUUIDs.slice(1, 4).map((id, idx) => (
                        <div
                          key={idx}
                          onClick={async () => {
                            const success = await copyText(id);
                            if (success) {
                              triggerToast(`UUID ${id} disalin!`);
                            }
                          }}
                          className="flex items-center justify-between p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-cyan-300 cursor-pointer transition"
                        >
                          <span className="truncate max-w-[220px]">{id}</span>
                          <Copy className="w-3 h-3 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* OPERATION 3: INSERT TIMESTAMP (FEATURE REQUESTED) */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Insert Timestamp
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Aturan X1 Valid</span>
                </div>

                {/* Format selection */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <button
                    onClick={() => setSelectedTimeFormat('x1')}
                    className={`p-1.5 rounded text-left border transition ${
                      selectedTimeFormat === 'x1'
                        ? 'bg-amber-950/40 border-amber-600/60 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>Rule X1 (Standar)</div>
                    <div className="text-[9px] text-slate-500 font-normal">YYYY-MM-DD jam: ?</div>
                  </button>

                  <button
                    onClick={() => setSelectedTimeFormat('iso_utc')}
                    className={`p-1.5 rounded text-left border transition ${
                      selectedTimeFormat === 'iso_utc'
                        ? 'bg-cyan-950/40 border-cyan-600/60 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>ISO 8601 UTC</div>
                    <div className="text-[9px] text-slate-500 font-normal">...Z (Zulu)</div>
                  </button>

                  <button
                    onClick={() => setSelectedTimeFormat('iso_local')}
                    className={`p-1.5 rounded text-left border transition ${
                      selectedTimeFormat === 'iso_local'
                        ? 'bg-cyan-950/40 border-cyan-600/60 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>ISO Local Time</div>
                    <div className="text-[9px] text-slate-500 font-normal">Offset Timezone</div>
                  </button>

                  <button
                    onClick={() => setSelectedTimeFormat('wib')}
                    className={`p-1.5 rounded text-left border transition ${
                      selectedTimeFormat === 'wib'
                        ? 'bg-cyan-950/40 border-cyan-600/60 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>Format Indonesia</div>
                    <div className="text-[9px] text-slate-500 font-normal">Tgl, Jam WIB</div>
                  </button>
                </div>

                {/* Preview Box */}
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 flex items-center justify-between">
                  <span className="truncate mr-2">{currentTimeStr}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 shrink-0">
                    Live
                  </span>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyTimestamp}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs transition border border-slate-700 active:scale-[0.98]"
                    >
                      {timestampCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{timestampCopied ? 'Tersalin' : 'Salin Waktu'}</span>
                    </button>

                    <button
                      onClick={handleApplyTimestampToWAL}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-700/60 font-medium text-xs transition active:scale-[0.98]"
                      title="Update nilai timestamp pada WAL dan Status Audit secara langsung"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Update ke WAL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* QUICK SESSION_STATE EXPORT & RECOVERY SHORTCUT */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-cyan-400" /> Aksi Cepat Berkas
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyAllMarkdown}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Salin .md Utuh</span>
                  </button>

                  <button
                    onClick={handleDownloadFile}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium transition"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>Export .md</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'snippets' && (
            <div className="space-y-3.5">
              <div className="text-[11px] text-slate-400">
                Pilih snippet ZLCE v3.2.2 untuk disalin ke prompt AI atau terminal Git:
              </div>

              {/* Snippet 1: Task Baru */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-[11px]">Baris Task Matriks Baru</span>
                  <button
                    onClick={handleInsertNewTask}
                    className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-[10px] hover:bg-cyan-900 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah Langsung
                  </button>
                </div>
                <pre className="p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-300 overflow-x-auto">
{`| TASK-00X | Nama Fitur | TASK-PREV | PENDING | - | - |`}
                </pre>
              </div>

              {/* Snippet 2: Git Gate Tags */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-white text-[11px]">Git Tag Checkpoint Gerbang</span>
                <div className="space-y-1.5 text-[10px] font-mono">
                  <button
                    onClick={() => handleCopyGitTag('gate-1-blueprint')}
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-between group"
                  >
                    <span>git tag -a gate-1-blueprint -m "Approved"</span>
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </button>
                  <button
                    onClick={() => handleCopyGitTag('gate-2-architecture')}
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-between group"
                  >
                    <span>git tag -a gate-2-architecture -m "Approved"</span>
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              </div>

              {/* Snippet 3: Checkpoint Block */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-[11px]">Checkpoint Block Template</span>
                  <button
                    onClick={async () => {
                      const snippet = `### CHECKPOINT [TASK-00X]\n- File: \`path/to/file.ext\`\n- Status: LENGKAP\n- Command: \`pytest tests/test_feature.py\`\n- Hasil: PASS (10/10)`;
                      const success = await copyText(snippet);
                      if (success) {
                        triggerToast('Checkpoint Block template disalin!');
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Salin
                  </button>
                </div>
                <pre className="p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-400 overflow-x-auto">
{`### CHECKPOINT [TASK-00X]
- File: path/to/file.ext
- Status: LENGKAP
- Command: pytest tests/
- Hasil: PASS (10/10)`}
                </pre>
              </div>
            </div>
          )}

          {activeSubTab === 'audit' && (
            <div className="space-y-3.5">
              {/* Linter Status */}
              <div className={`p-3 rounded-xl border ${
                validation.valid
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px] flex items-center gap-1.5">
                    {validation.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    )}
                    Hasil zlce-check
                  </span>
                  <button
                    onClick={onRunLinter}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white"
                  >
                    Re-Scan
                  </button>
                </div>
                <p className="text-[10px] mt-1 text-slate-400">
                  {validation.valid
                    ? 'Format SESSION_STATE.md valid dan mematuhi Aturan X1 & R1-R12.'
                    : `${validation.errorsCount} Error, ${validation.warningsCount} Warning terdeteksi.`}
                </p>
              </div>

              {/* Status Aktif Ringkasan */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px] font-mono">
                <span className="font-sans font-semibold text-slate-200 text-xs block">
                  Status Sesi Saat Ini
                </span>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Task Aktif:</span>
                    <strong className="text-cyan-400">{stateData.status.activeTask} ({stateData.status.activeTaskStatus})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Done:</span>
                    <strong className="text-emerald-400">{stateData.status.lastDoneTask}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Task:</span>
                    <strong className="text-slate-200">{stateData.status.nextTask}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch:</span>
                    <strong className="text-slate-300">{stateData.status.gitBranch}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Time:</span>
                    <strong className="text-amber-400 truncate max-w-[150px]">{stateData.status.timestampAudit}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            ZLCE Kit v3.2.2
          </span>
          <button
            onClick={() => {
              onToggleFullscreen();
            }}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" /> Fullscreen Editor
          </button>
        </div>
      </aside>
    </>
  );
};
