import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import QRCode from 'qrcode';

export default function WhatsAppPage() {
  const [status, setStatus] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const r = await api.get('/whatsapp/status');
      setStatus(r.data.data);
      // Generate QR if available and not connected
      if (r.data.data?.qr && !r.data.data?.online) {
        const url = await QRCode.toDataURL(r.data.data.qr, { width: 256, margin: 1 });
        setQrDataUrl(url);
      } else {
        setQrDataUrl(null);
      }
    } catch {}
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 10000); return () => clearInterval(t); }, [fetch]);

  const restart = async () => {
    setActionLoading('restart');
    try {
      const r = await api.post('/whatsapp/restart');
      alert(r.data?.data?.message || 'Restart initiated');
      setTimeout(fetch, 3000);
    } catch (e: any) {
      alert('Failed: ' + (e.response?.data?.error || e.message));
    }
    setActionLoading(null);
  };

  const logout = async () => {
    if (!confirm('This will disconnect the bot and delete saved credentials. You will need to scan a new QR code.')) return;
    setActionLoading('logout');
    try {
      const r = await api.post('/whatsapp/logout');
      alert(r.data?.data?.message || 'Logged out');
      fetch();
    } catch (e: any) {
      alert('Failed: ' + (e.response?.data?.error || e.message));
    }
    setActionLoading(null);
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#8E867C] mb-1 font-medium">Messaging</p>
        <h2 className="text-2xl font-bold text-[#1a1817]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>WhatsApp Bot</h2>
        <p className="text-sm text-[#8E867C] mt-1">Customer stock-check chatbot with Gemma 4 AI</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Status card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EFEDE8]">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${status?.online ? 'bg-green-50' : 'bg-red-50'}`}>
              {status?.online ? '◈' : '◇'}
            </div>
            <div>
              <div className={`text-sm font-semibold ${status?.online ? 'text-green-700' : 'text-[#BA1A1A]'}`}>
                {status?.online ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-xs text-[#8E867C]">
                {status?.online ? 'Bot is ready to respond' : 'Bot is not connected'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={restart} disabled={actionLoading !== null}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-[#EFEDE8] disabled:opacity-40"
              style={{ borderColor: '#83764F', color: '#83764F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {actionLoading === 'restart' ? 'Restarting...' : status?.online ? '⟳ Restart Bot' : '⟳ Connect Bot'}
            </button>
            <button onClick={logout} disabled={actionLoading !== null}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 text-[#BA1A1A] transition-all hover:bg-red-50 disabled:opacity-40"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {actionLoading === 'logout' ? 'Logging out...' : '⏻ Logout & Reset'}
            </button>
          </div>
        </div>

        {/* Capabilities */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EFEDE8]">
          <h3 className="text-sm font-semibold text-[#1a1817] mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Capabilities</h3>
          <ul className="space-y-2 text-sm text-[#6B6560]">
            <li className="flex items-center gap-2"><span className="text-[#83764F]">◆</span> Stock checking by product name</li>
            <li className="flex items-center gap-2"><span className="text-[#83764F]">◆</span> Natural language (Bahasa Indonesia)</li>
            <li className="flex items-center gap-2"><span className="text-[#83764F]">◆</span> Jewellery-only guardrail</li>
            <li className="flex items-center gap-2"><span className="text-[#83764F]">◆</span> Multi-store search</li>
          </ul>
        </div>
      </div>

      {/* QR Code display */}
      {qrDataUrl && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EFEDE8] mb-5">
          <h3 className="text-sm font-semibold text-[#1a1817] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Scan QR Code</h3>
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl border-2 border-[#83764F] inline-block">
              <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
          </div>
          <p className="text-center text-xs text-[#8E867C] mt-3">
            Open WhatsApp → Linked Devices → Scan this QR code
          </p>
        </div>
      )}

      {/* Pairing instructions */}
      <div className="p-5 rounded-xl border border-amber-200" style={{ background: 'linear-gradient(135deg, #FFF8E7, #FFF1D0)' }}>
        <h4 className="text-sm font-semibold text-amber-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {status?.online ? 'Re-pairing Instructions' : 'Pairing Instructions'}
        </h4>
        <p className="text-sm text-amber-800 mb-3">
          {status?.online
            ? 'Logout first, then click Connect Bot to pair with a new number.'
            : 'Click Connect Bot to generate a QR code, then scan with WhatsApp.'}
        </p>
        <code className="block text-xs p-3 rounded-lg bg-white/60 border border-amber-200 font-mono text-amber-900">
          pm2 logs catalogue-backend | grep 'wa-bot'
        </code>
      </div>
    </div>
  );
}
