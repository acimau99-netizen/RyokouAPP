import React from 'react';
import { 
  FileText, 
  Terminal, 
  RotateCcw, 
  GitFork, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  Clock, 
  Cpu,
  GraduationCap,
  Maximize2,
  Undo2,
  Redo2,
  Save
} from 'lucide-react';
import { TabType, ValidationResult } from '../types/zlce';
import { TokenUsageGauge } from './TokenUsageGauge';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  validation: ValidationResult;
  onRunLinter: () => void;
  rawMarkdown?: string;
  onToggleFullscreen?: () => void;
  persistence?: {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => boolean;
    redo: () => boolean;
    restoreFromStorage: () => boolean;
    resetToDefault?: () => void;
    lastSaved: Date | null;
    isSaved: boolean;
    hasStoredSession: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  validation,
  onRunLinter,
  rawMarkdown = '',
  onToggleFullscreen,
  persistence
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Meta info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">ZLCE Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v3.2.2
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Clock className="w-3 h-3" /> Rule X1 Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Zero-Loss Context Engineering • AI Agent Control Workbench
              </p>
            </div>
          </div>

          {/* Performance & Quality Indicators */}
          <div className="flex items-center space-x-2.5">
            {/* Live Token Usage Indicator */}
            <TokenUsageGauge rawMarkdown={rawMarkdown} variant="compact" />

            {/* Quick Linter Badge */}
            <button
              onClick={onRunLinter}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                validation.valid
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 text-rose-300 border-rose-700/60 hover:bg-rose-900/60'
              }`}
              title="Klik untuk re-evaluasi integritas SESSION_STATE.md"
            >
              <ShieldCheck className={`w-4 h-4 ${validation.valid ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
              <span className="font-semibold hidden sm:inline">{validation.valid ? 'STATE: OK' : 'STATE: GAGAL'}</span>
              <span className="text-slate-400">({validation.errorsCount} err)</span>
            </button>

            {/* Persistence & Undo/Restore Controls */}
            {persistence && (
              <div className="flex items-center space-x-1 sm:space-x-1.5 pl-1 border-l border-slate-800">
                {/* Auto-save Status Pill */}
                <div 
                  className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400 select-none"
                  title={persistence.lastSaved ? `Tersimpan di LocalStorage: ${persistence.lastSaved.toLocaleTimeString('id-ID')}` : 'Auto-save aktif'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${persistence.isSaved ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                  <span className="hidden lg:inline">{persistence.isSaved ? 'Tersimpan' : 'Menyimpan...'}</span>
                </div>

                {/* Undo Button */}
                <button
                  onClick={() => persistence.undo()}
                  disabled={!persistence.canUndo}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono transition border ${
                    persistence.canUndo
                      ? 'bg-slate-900 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-200 active:scale-95'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Undo Perubahan (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Undo</span>
                </button>

                {/* Redo Button */}
                <button
                  onClick={() => persistence.redo()}
                  disabled={!persistence.canRedo}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono transition border ${
                    persistence.canRedo
                      ? 'bg-slate-900 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-200 active:scale-95'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Redo Perubahan (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Redo</span>
                </button>

                {/* Restore Saved Session Button */}
                {persistence.hasStoredSession && (
                  <button
                    onClick={() => persistence.restoreFromStorage()}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/70 text-cyan-300 transition active:scale-95"
                    title="Pulihkan sesi dari localStorage"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden xl:inline text-[11px]">Restore</span>
                  </button>
                )}
              </div>
            )}

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 transition"
                title="Buka Editor Layar Penuh (Ctrl+Shift+F)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('session')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'session'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>SESSION_STATE & WAL</span>
          </button>

          <button
            onClick={() => setActiveTab('initiation')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'initiation'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Inisiasi Proyek (4 Gerbang)</span>
          </button>

          <button
            onClick={() => setActiveTab('prompt-engine')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'prompt-engine'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Loss Prompt &amp; Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('runtime-engine')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'runtime-engine'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Runtime &amp; Token Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'recovery'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Pemulihan Sesi (Kasus A-D)</span>
          </button>

          <button
            onClick={() => setActiveTab('triage')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'triage'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Triase Revisi (R7)</span>
          </button>

          <button
            onClick={() => setActiveTab('harness')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'harness'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Verifikasi Kit (100% Lulus)</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'templates'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kit Templates &amp; Pack</span>
          </button>

          <button
            onClick={() => setActiveTab('tutorial')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'tutorial'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 bg-emerald-950/20 border border-emerald-800/40'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Tutorial &amp; Panduan Pemakaian</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
