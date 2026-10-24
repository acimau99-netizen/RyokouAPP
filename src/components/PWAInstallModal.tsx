import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  X,
  Download,
  Smartphone,
  CheckCircle,
  Share2,
  PlusSquare,
  ShieldCheck,
} from 'lucide-react';

interface PWAInstallModalProps {
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-sm">🛵</span>
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Instalasi RyokoRent APK</h2>
              <p className="text-xs text-cyan-400 font-mono">PWA Standalone Android</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {isInstalled ? (
            <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-xl p-4 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Aplikasi Sudah Terpasang!</h3>
              <p className="text-emerald-200">
                RyokoRent sudah berjalan dalam mode standalone di perangkat Anda. Akses melalui ikon di layar utama / app drawer.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Keuntungan Memasang Sebagai APK:</span>
                </h3>
                <ul className="space-y-1.5 text-slate-300 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>100% Offline:</strong> Seluruh database LocalStorage tetap dapat diakses tanpa koneksi internet.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Layar Penuh (Full Screen):</strong> Tampilan native Android tanpa bilah alamat browser.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Ikon di Beranda HP:</strong> Akses instan langsung dari home screen smartphone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Ringan & Hemat Kuota:</strong> Ukuran kurang dari 1 MB tanpa beban sistem.</span>
                  </li>
                </ul>
              </div>

              {/* Install Direct Action if available */}
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <Download className="w-5 h-5 text-slate-950" />
                  <span>Pasang Aplikasi Sekarang</span>
                </button>
              )}

              {/* Step by Step Manual Guide for Android & Chrome */}
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <h4 className="font-bold text-slate-200">Cara Pasang Manual di Google Chrome (Android):</h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
                  <li>
                    Tekan ikon <strong>Menu ⋮</strong> (titik tiga) di sudut kanan atas browser Chrome.
                  </li>
                  <li>
                    Pilih menu <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>.
                  </li>
                  <li>
                    Tekan tombol <strong>&quot;Instal&quot;</strong> saat jendela konfirmasi muncul.
                  </li>
                </ol>
              </div>

              {/* iOS Safari Fallback Guide */}
              {isIOS && (
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  <h4 className="font-bold text-slate-200">Panduan untuk Pengguna Apple (iOS Safari):</h4>
                  <p className="text-slate-400">
                    1. Tap tombol <strong>Bagikan (Share)</strong> <Share2 className="w-3.5 h-3.5 inline mx-1" /> di toolbar Safari.<br />
                    2. Gulir ke bawah dan tap <strong>&quot;Add to Home Screen&quot; (Tambah ke Layar Utama)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1" />.<br />
                    3. Tap <strong>&quot;Add&quot;</strong> di pojok kanan atas.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
