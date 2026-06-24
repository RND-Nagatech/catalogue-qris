import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function ImageIndexPage() {
  const [status, setStatus] = useState<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/image-index/status');
      const s = res.data.data;
      setStatus(s);
      if (!s?.running && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    } catch {}
  };

  useEffect(() => { fetchStatus(); return () => clearInterval(intervalRef.current!); }, []);

  const startIndex = async (reset: boolean) => {
    await api.post(`/image-index/start?reset=${reset}`);
    intervalRef.current = setInterval(fetchStatus, 2000);
  };

  const pct = status?.total ? Math.round((status.indexed / status.total) * 100) || 0 : 0;

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#8E867C] mb-1 font-medium">Qdrant</p>
          <h2 className="text-2xl font-bold text-[#1a1817]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Image Index</h2>
          <p className="text-sm text-[#8E867C] mt-1">Build DINOv2 vector index from synced images</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => startIndex(false)} disabled={status?.running}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#83764F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {status?.running ? 'Indexing...' : 'Build Index'}
          </button>
          <button onClick={() => { if (confirm('Reset & rebuild from scratch?')) startIndex(true); }} disabled={status?.running}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:bg-red-50 disabled:opacity-40"
            style={{ borderColor: '#BA1A1A', color: '#BA1A1A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Reset & Rebuild
          </button>
        </div>
      </div>

      {status && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Images', value: status.total?.toLocaleString() ?? '0', color: '#1a1817' },
              { label: 'Indexed', value: status.indexed?.toLocaleString() ?? '0', color: '#2D6A4F' },
              { label: 'Skipped', value: status.skipped?.toLocaleString() ?? '0', color: '#83764F' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-[#EFEDE8]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E867C] mb-2 font-medium">{s.label}</div>
                <div className="text-3xl font-bold tracking-tight" style={{ color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {status.running && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#EFEDE8]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#8E867C]">Progress</span>
                <span className="font-semibold text-[#1a1817]">{pct}%</span>
              </div>
              <div className="w-full h-2 bg-[#EFEDE8] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #83764F, #A6956D)' }} />
              </div>
              <p className="text-xs text-[#8E867C] mt-2">
                {status.current_file || 'Processing...'} &middot; {status.indexed}/{status.total} indexed &middot; {status.errors} errors
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
