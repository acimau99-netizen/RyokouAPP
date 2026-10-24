import React, { useState } from 'react';
import { Cpu, Zap, Info, ChevronUp, ChevronDown, Activity, Sparkles } from 'lucide-react';

interface TokenUsageGaugeProps {
  rawMarkdown: string;
  variant?: 'compact' | 'footer' | 'card';
  maxBudget?: number; // default safe Tier 0 target budget e.g. 4000 tokens
}

export const TokenUsageGauge: React.FC<TokenUsageGaugeProps> = ({
  rawMarkdown,
  variant = 'compact',
  maxBudget = 4000
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const charCount = rawMarkdown.length;
  // Standard heuristic: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(charCount / 4);
  const wordCount = rawMarkdown.trim() ? rawMarkdown.trim().split(/\s+/).length : 0;
  const lineCount = rawMarkdown ? rawMarkdown.split(/\r?\n/).length : 0;

  const percentage = Math.min(100, Math.round((estimatedTokens / maxBudget) * 100));

  // Determine health color tier
  let colorTier = 'emerald';
  let tierLabel = 'Safe Tier 0';
  if (estimatedTokens > 3000) {
    colorTier = 'rose';
    tierLabel = 'Heavy (Near Limit)';
  } else if (estimatedTokens > 1500) {
    colorTier = 'amber';
    tierLabel = 'Moderate';
  }

  if (variant === 'compact') {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
            colorTier === 'emerald'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
              : colorTier === 'amber'
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
          }`}
          title="Estimasi konsumsi token Tier 0 (1 token ≈ 4 karakter). Klik untuk rincian."
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold">~{estimatedTokens.toLocaleString()} tkn</span>
          <span className="text-slate-400 text-[10px] hidden md:inline">({charCount.toLocaleString()} chars)</span>
        </button>

        {showDetails && (
          <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs text-slate-200 animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-bold flex items-center gap-1.5 text-cyan-400">
                <Cpu className="w-4 h-4" /> Token Consumption Gauge
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                colorTier === 'emerald' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}>
                {tierLabel}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Rasio Standar:</span>
                <span className="text-slate-200">1 Token ≈ 4 Karakter</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Karakter:</span>
                <span className="text-cyan-300">{charCount.toLocaleString()} karakter</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Kata / Baris:</span>
                <span className="text-slate-300">{wordCount.toLocaleString()} kata / {lineCount} baris</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                <span>Estimasi Token (Tier 0):</span>
                <span className="text-emerald-400 font-bold">~{estimatedTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Target Pinned Budget:</span>
                <span className="text-slate-300">{maxBudget.toLocaleString()} tokens</span>
              </div>
            </div>

            {/* Visual mini bar */}
            <div className="mt-2.5">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${percentage}%` }}
                  className={`h-full ${
                    colorTier === 'emerald' ? 'bg-emerald-400' : colorTier === 'amber' ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 tkn</span>
                <span>{percentage}% dari target</span>
                <span>{maxBudget} tkn</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Footer / Full Banner variant
  return (
    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          colorTier === 'emerald' 
            ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400' 
            : 'bg-amber-950/60 border-amber-700/60 text-amber-400'
        }`}>
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">
              Tier 0 Token Consumption Monitor
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              colorTier === 'emerald' 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
                : 'bg-amber-950 text-amber-300 border border-amber-700/60'
            }`}>
              {tierLabel} ({percentage}% budget)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dihitung dari <strong className="text-slate-300">{charCount.toLocaleString()}</strong> karakter teks <code>rawMarkdown</code> aktif menggunakan rasio standar <strong className="text-cyan-400">1 token / 4 karakter</strong>.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
        <div className="text-left sm:text-right font-mono">
          <div className="text-sm font-bold text-cyan-400">
            ~{estimatedTokens.toLocaleString()} <span className="text-xs font-normal text-slate-400">tokens</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {wordCount.toLocaleString()} kata • {lineCount} baris
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-24 sm:w-28 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
          <div
            style={{ width: `${percentage}%` }}
            className={`h-full transition-all ${
              colorTier === 'emerald' ? 'bg-emerald-400' : colorTier === 'amber' ? 'bg-amber-400' : 'bg-rose-400'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
