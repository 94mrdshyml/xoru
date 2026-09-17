'use client';

import React, { useState } from 'react';
import { CustomModal } from './ui/CustomModal';
import { MorphButton } from './ui/MorphButton';
import { Download, Copy, Check, Link as LinkIcon } from '@deemlol/next-icons';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl: string;
  title: string;
}

export function QrCodeModal({ isOpen, onClose, shortUrl, title }: QrCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(shortUrl)}&size=350&margin=2&format=png`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qrcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(qrImageUrl, '_blank');
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Short Link QR Code"
      description={`Scannable vector QR code for "${title}"`}
    >
      <div className="flex flex-col items-center space-y-6 pt-2">
        {/* QR Code Container */}
        <div className="relative flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR code for ${shortUrl}`}
            className="w-56 h-56 rounded-lg object-contain transition-transform duration-200 hover:scale-[1.02]"
          />
        </div>

        {/* Short Link Display */}
        <div className="flex items-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2.5">
          <LinkIcon className="w-4 h-4 text-indigo-600 shrink-0 stroke-[2]" />
          <span className="text-sm font-medium text-slate-700 truncate flex-1">{shortUrl}</span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <MorphButton onAsyncClick={handleDownload} successText="Downloaded!">
            <Download className="w-4 h-4 stroke-[2]" />
            <span>Download PNG</span>
          </MorphButton>
        </div>
      </div>
    </CustomModal>
  );
}

