import React, { useState } from 'react';
import { 
  BookOpen, 
  Copy, 
  Check, 
  Download, 
  Package, 
  FileCode, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { ZLCE_TEMPLATES } from '../data/templates';
import { TemplateItem } from '../types/zlce';
import { copyText } from '../utils/clipboard';


export const TemplatesTab: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(ZLCE_TEMPLATES[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedPack, setCopiedPack] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  const filtered = ZLCE_TEMPLATES.filter(t => {
    if (categoryFilter === 'all') return true;
    return t.category === categoryFilter;
  });

  // Replicating zlce-pack.py
  const generateSingleKitBundle = () => {
    let header = `# ZLCE KIT (SATU BERKAS) v3.2.2

Berkas ini menggabungkan seluruh berkas kit yang dibutuhkan AI. Setiap berkas dibatasi penanda
<<<FILE: path>>> dan <<<END FILE>>>. Perlakukan tiap bagian sebagai berkas terpisah dengan nama tersebut.
Dibangun otomatis oleh ZLCE Studio Pack Engine untuk Zero-Loss Context Engineering v3.2.2 (Aturan X1 Anti-Ekstrapolasi Jam).

DAFTAR BERKAS:
${ZLCE_TEMPLATES.map(t => `- templates/${t.filename}`).join('\n')}

`;

    let body = '';
    for (const item of ZLCE_TEMPLATES) {
      body += `<<<FILE: templates/${item.filename}>>>\n`;
      body += item.content.trim() + '\n';
      body += `<<<END FILE>>>\n\n`;
    }

    return header + body;
  };

  const handleCopyFile = async () => {
    const success = await copyText(selectedTemplate.content);
    if (success) {
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 2000);
    }
  };

  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([selectedTemplate.content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = selectedTemplate.filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyPack = async () => {
    const success = await copyText(generateSingleKitBundle());
    if (success) {
      setCopiedPack(true);
      setTimeout(() => setCopiedPack(false), 2000);
    }
  };

  const handleDownloadPack = () => {
    const element = document.createElement('a');
    const file = new Blob([generateSingleKitBundle()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = 'ZLCE_KIT_SINGLE.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Pustaka Template Kontrol &amp; Pack Studio (ZLCE v3.2.2)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kumpulan 10 dokumen kontrol baku ZLCE v3.2.2 beserta generator pemaket satu berkas (zlce-pack.py) untuk prompt tunggal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPackModal(!showPackModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
          >
            <Package className="w-4 h-4" />
            {showPackModal ? 'Tutup Packer' : 'Generator ZLCE_KIT_SINGLE.md'}
          </button>

          <button
            onClick={handleDownloadPack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
          >
            <Download className="w-4 h-4" /> Unduh Single Kit
          </button>
        </div>
      </div>

      {/* Single Kit Modal / Drawer preview if opened */}
      {showPackModal && (
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-indigo-200">
                Bundel Single-File Kit: ZLCE_KIT_SINGLE.md (Semua 10 Template Tergabung)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPack}
                className="text-xs px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1"
              >
                {copiedPack ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPack ? 'Tersalin' : 'Salin Seluruh Kit'}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Cocok untuk model atau antarmuka yang hanya menerima 1 lampiran teks atau untuk sekali tempel di Google AI Studio.
          </p>
          <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-xs max-h-48 overflow-y-auto rounded-lg border border-indigo-900/40">
            {generateSingleKitBundle().substring(0, 800)}... (seluruh 10 berkas terpasang)
          </pre>
        </div>
      )}

      {/* Main Grid: Template browser */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template List */}
        <div className="lg:col-span-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              10 Berkas Kontrol Kit
            </span>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-[11px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="state">State (Session)</option>
              <option value="workflow">Workflow &amp; Tata Kelola</option>
              <option value="spec">Spesifikasi Arsitektur</option>
              <option value="profile">Profil Domain</option>
            </select>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[560px] overflow-y-auto">
            {filtered.map((item) => {
              const isSelected = item.id === selectedTemplate.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedTemplate(item)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 border-l-4 border-cyan-400'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate pr-2">
                      {item.filename}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-cyan-300">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="text-xs text-slate-300 font-medium mt-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Template Content Preview */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold block">
                {selectedTemplate.filename}
              </span>
              <span className="text-xs text-slate-400">{selectedTemplate.description}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFile}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFile ? 'Tersalin' : 'Salin'}
              </button>
              <button
                onClick={handleDownloadFile}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition"
              >
                <Download className="w-3.5 h-3.5" /> Unduh .md
              </button>
            </div>
          </div>

          <pre className="flex-1 p-4 bg-slate-950 text-slate-300 font-mono text-xs overflow-y-auto max-h-[520px] whitespace-pre-wrap leading-relaxed">
            {selectedTemplate.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
