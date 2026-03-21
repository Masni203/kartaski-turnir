'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareQRProps {
  tournamentId: string;
  tournamentName: string;
}

export default function ShareQR({ tournamentId, tournamentName }: ShareQRProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tournament/${tournamentId}`
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = '#0a0f0d';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
      }
      const link = document.createElement('a');
      link.download = `${tournamentName.replace(/\s+/g, '-')}-QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-emerald-950/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-lg">
            📱
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white">Podeli turnir</h3>
            <p className="text-xs text-emerald-300/35">QR kod za pracenje uzivo</p>
          </div>
        </div>
        <span className={`text-amber-400/40 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 animate-fade-in">
          <div className="flex flex-col items-center gap-5">
            <div className="bg-white p-4 rounded-2xl shadow-lg shadow-black/20">
              <QRCodeSVG
                id="qr-code-svg"
                value={publicUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0a0f0d"
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-emerald-300/40 text-sm text-center max-w-xs">
              Skeniraj QR kod ili podeli link da drugi prate turnir uzivo
            </p>

            <div className="w-full flex gap-2">
              <div className="flex-1 bg-emerald-950/50 border border-emerald-700/30 rounded-xl px-4 py-2.5 text-sm text-emerald-200/50 truncate">
                {publicUrl}
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  copied
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-950/50 border-emerald-700/30 text-white hover:border-amber-500/30'
                }`}
              >
                {copied ? 'Kopirano!' : 'Kopiraj'}
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 py-3 rounded-xl font-bold hover:from-amber-500 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 text-sm"
            >
              Preuzmi QR kod kao sliku
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
