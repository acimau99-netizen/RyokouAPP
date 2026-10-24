import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Columns, 
  FileText, 
  Clock, 
  Hash, 
  Plus, 
  Layers,
  Activity,
  Sparkles,
  Undo2,
  Redo2,
  RotateCcw
} from 'lucide-react';
import { ParsedSessionState, ValidationResult } from '../types/zlce';
import { parseSessionStateMarkdown, serializeSessionStateToMarkdown } from '../utils/markdownParser';
import { generateUUIDv4 } from '../utils/uuid';
import { copyText } from '../utils/clipboard';


interface FullscreenEditorModalProps {
  rawMarkdown: string;
  onUpdateMarkdown: (newMd: string) => void;
  onUpdateStateData: (newData: ParsedSessionState) => void;
  validation: ValidationResult;
  onClose: () => void;
  persistence?: {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => boolean;
    redo: () => boolean;
    restoreFromStorage: () => boolean;
    lastSaved: Date | null;
    isSaved: boolean;
  };
}

export const FullscreenEditorModal: React.FC<FullscreenEditorModalProps> = ({
  rawMarkdown,
  onUpdateMarkdown,
  onUpdateStateData,
  validation,
  onClose,
  persistence
}) => {
  const [content, setContent] = useState<string>(rawMarkdown);
  const [splitView, setSplitView] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'text-xs' | 'text-sm' | 'text-base'>('text-sm');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync incoming rawMarkdown if updated externally
  useEffect(() => {
    setContent(rawMarkdown);
  }, [rawMarkdown]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleChange = (newVal: string) => {
    setContent(newVal);
    onUpdateMarkdown(newVal);
    try {
      const parsed = parseSessionStateMarkdown(newVal);
      onUpdateStateData(parsed);
    } catch {
      // Ignore during typing
    }
  };

  // Insert text at current cursor position in textarea
  const insertAtCursor = (textToInsert: string, label: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleChange(content + '\n' + textToInsert);
      showToast(`${label} ditambahkan ke akhir file`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const updated = before + textToInsert + after;

    handleChange(updated);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);

    showToast(`${label} disisipkan di posisi kursor`);
  };

  const handleGenerateUUID = () => {
    const newUuid = generateUUIDv4();
    insertAtCursor(newUuid, `UUID (${newUuid.slice(0, 8)}...)`);
  };

  const handleInsertTimestampX1 = () => {
    const today = new Date().toISOString().slice(0, 10);
    const stamp = `${today} jam: ?`;
    insertAtCursor(stamp, `Timestamp Rule X1 (${stamp})`);
  };

  const handleInsertTimestampISO = () => {
    const iso = new Date().toISOString();
    insertAtCursor(iso, `Timestamp ISO (${iso})`);
  };

  const handleInsertTaskTemplate = () => {
    const template = `\n| TASK-XXX | [Nama Task Spesifik] | TASK-PREV | PENDING | - | - |`;
    insertAtCursor(template, 'Baris Task Baru');
  };

  const handleCopy = async () => {
    const success = await copyText(content);
    if (success) {
      setCopied(true);
      showToast('Seluruh SESSION_STATE.md disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Gagal menyalin teks ke clipboard');
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'SESSION_STATE.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    showToast('SESSION_STATE.md berhasil diunduh');
  };

  // Approximate token calculation
  const charCount = content.length;
  const approxTokens = Math.ceil(charCount / 4);

  // Parse preview for split view
  let previewParsed: ParsedSessionState | null = null;
  try {
    previewParsed = parseSessionStateMarkdown(content);
  } catch {
    previewParsed = null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-slate-100 font-sans">
      {/* Top Fullscreen Header & Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  SESSION_STATE.md
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                  Fullscreen Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Distraction-Free Editor • Live ZLCE v3.2.2 Synchronization
              </p>
            </div>
          </div>

          {/* Diagnostic pill */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            {validation.valid ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> LINT OK
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" /> {validation.errorsCount} Error(s)
              </span>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">~{approxTokens.toLocaleString()} tokens</span>
          </div>
        </div>

        {/* Quick Insertion Tools in Fullscreen Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleGenerateUUID}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Generate New UUID and insert at cursor"
          >
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Insert UUID</span>
          </button>

          <button
            onClick={handleInsertTimestampX1}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Insert ZLCE Rule X1 Timestamp (YYYY-MM-DD jam: ?)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Timestamp X1</span>
          </button>

          <button
            onClick={handleInsertTimestampISO}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Insert ISO 8601 Timestamp"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ISO Time</span>
          </button>

          <button
            onClick={handleInsertTaskTemplate}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Insert new task row template"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">+ Task Row</span>
          </button>

          {/* Undo / Redo in Fullscreen */}
          {persistence && (
            <>
              <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />
              <button
                onClick={() => {
                  const ok = persistence.undo();
                  if (ok) showToast('Undo berhasil');
                }}
                disabled={!persistence.canUndo}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition ${
                  persistence.canUndo
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-950/40 text-slate-600 border-slate-850 cursor-not-allowed opacity-50'
                }`}
                title="Undo Perubahan (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Undo</span>
              </button>

              <button
                onClick={() => {
                  const ok = persistence.redo();
                  if (ok) showToast('Redo berhasil');
                }}
                disabled={!persistence.canRedo}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition ${
                  persistence.canRedo
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-950/40 text-slate-600 border-slate-850 cursor-not-allowed opacity-50'
                }`}
                title="Redo Perubahan (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Redo</span>
              </button>

              <button
                onClick={() => {
                  const ok = persistence.restoreFromStorage();
                  if (ok) showToast('Sesi dipulihkan dari LocalStorage');
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition"
                title="Pulihkan dari LocalStorage"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Restore</span>
              </button>
            </>
          )}

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

          {/* Toggle Split View */}
          <button
            onClick={() => setSplitView(!splitView)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition ${
              splitView
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Split View (Editor + Live Preview)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Split View</span>
          </button>

          {/* Font Size Toggle */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg flex text-xs font-mono">
            <button
              onClick={() => setFontSize('text-xs')}
              className={`px-2 py-1 ${fontSize === 'text-xs' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
              title="Small Font"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('text-sm')}
              className={`px-2 py-1 border-x border-slate-800 ${fontSize === 'text-sm' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
              title="Normal Font"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('text-base')}
              className={`px-2 py-1 ${fontSize === 'text-base' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
              title="Large Font"
            >
              A+
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Copy all markdown"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Download .md file"
          >
            <Download className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Close / Exit Fullscreen Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition shadow ml-1"
            title="Exit Fullscreen Editor (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Keluar (Esc)</span>
          </button>
        </div>
      </header>

      {/* Toast Notification Floating */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-cyan-900 border border-cyan-500 text-cyan-100 text-xs px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Markdown Editor */}
        <div className={`flex-1 flex flex-col h-full bg-slate-950 border-r border-slate-800/80 ${splitView ? 'w-1/2' : 'w-full'}`}>
          <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Editor Markdown (Langsung Sinkron)</span>
            <span>{content.split('\n').length} baris • {charCount} karakter</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full flex-1 p-4 bg-slate-950 text-slate-200 font-mono ${fontSize} leading-relaxed focus:outline-none resize-none overflow-y-auto selection:bg-cyan-900 selection:text-white`}
            placeholder="Ketik isi SESSION_STATE.md..."
            spellCheck={false}
          />
        </div>

        {/* Right Column: Live State Preview (if splitView enabled) */}
        {splitView && (
          <div className="w-1/2 flex flex-col h-full bg-slate-900/40 overflow-y-auto p-4 space-y-4">
            <div className="px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Live Structured Preview
              </span>
              <span className="text-slate-400">
                {previewParsed?.tasks.length || 0} Tasks terdeteksi
              </span>
            </div>

            {previewParsed ? (
              <div className="space-y-4 text-xs">
                {/* Status Aktif Preview */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>1. Status Aktif</span>
                    <span className="font-mono text-[11px] text-cyan-400">
                      Task Aktif: {previewParsed.status.activeTask} ({previewParsed.status.activeTaskStatus})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div>Git Branch: <span className="text-slate-200">{previewParsed.status.gitBranch}</span></div>
                    <div>Audit: <span className="text-slate-200">{previewParsed.status.timestampAudit}</span></div>
                    <div>Done Terakhir: <span className="text-slate-200">{previewParsed.status.lastDoneTask}</span></div>
                    <div>Next Task: <span className="text-slate-200">{previewParsed.status.nextTask}</span></div>
                  </div>
                </div>

                {/* Task Matrix Preview */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>2. Matriks Task ({previewParsed.tasks.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto font-mono text-[11px]">
                    {previewParsed.tasks.map((task, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded border flex items-center justify-between ${
                          task.status === 'IN_PROGRESS' 
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-200' 
                            : task.status === 'DONE'
                            ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-400">{task.id}</span>
                          <span className="truncate max-w-[200px]">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800">
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WAL State Preview */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>3. Work In Progress (WAL)</span>
                    <span className="text-slate-500 font-mono">{previewParsed.wal.updatedTimestamp}</span>
                  </div>
                  <div className="space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div><strong className="text-cyan-400">Step:</strong> {previewParsed.wal.currentStep}</div>
                    <div><strong className="text-slate-400">Files:</strong> {previewParsed.wal.plannedFiles}</div>
                    <div><strong className="text-slate-400">Verif:</strong> <code className="text-emerald-400 font-mono">{previewParsed.wal.verificationCommand}</code></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl text-xs text-rose-300">
                Gagal mem-parsing struktur markdown. Pastikan format markdown memiliki heading yang valid.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-1.5 text-xs text-slate-400 flex items-center justify-between font-mono">
        <div className="flex items-center gap-4">
          <span>Aturan X1 Jam: <strong className="text-emerald-400 font-sans">Aktif (Anti-Ekstrapolasi)</strong></span>
          <span className="hidden sm:inline">Pintasan: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">Esc</kbd> Tutup Fullscreen</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Estimasi Token: <strong className="text-cyan-400">~{approxTokens.toLocaleString()}</strong></span>
        </div>
      </footer>
    </div>
  );
};
