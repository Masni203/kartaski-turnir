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
        ctx.fillStyle = '#0f1729';
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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-white/10 text-lg">
            📱
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white">Podijeli turnir</h3>
            <p className="text-xs text-emerald-300/40">QR kod za pracenje uzivo</p>
          </div>
        </div>
        <span className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 animate-fade-in">
          <div className="flex flex-col items-center gap-5">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-lg shadow-black/20">
              <QRCodeSVG
                id="qr-code-svg"
                value={publicUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f1729"
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-emerald-300/50 text-sm text-center max-w-xs">
              Skeniraj QR kod ili podijeli link da drugi prate turnir uzivo
            </p>

            {/* URL + Copy */}
            <div className="w-full flex gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-200/60 truncate">
                {publicUrl}
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  copied
                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {copied ? 'Kopirano!' : 'Kopiraj'}
              </button>
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white py-3 rounded-xl font-bold hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/20 text-sm"
            >
              Preuzmi QR kod kao sliku
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
