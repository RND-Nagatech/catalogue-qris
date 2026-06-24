import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function SyncImagesPage() {
  const [status, setStatus] = useState<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchStatus = async () => {
    const res = await api.get('/sync/status');
    const s = res.data.data;
    setStatus(s);
    if (!s?.running && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => { fetchStatus(); return () => clearInterval(intervalRef.current!); }, []);

  const startSync = async () => {
    await api.post('/sync/start');
    intervalRef.current = setInterval(fetchStatus, 2000);
  };

  const pct = status?.current ? Math.round((status.current.synced / status.current.total) * 100) || 0 : 0;

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#8E867C] mb-1 font-medium">Firebase</p>
          <h2 className="text-2xl font-bold text-[#1a1817]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sync Images</h2>
          <p className="text-sm text-[#8E867C] mt-1">Download product images from Firebase to local disk</p>
        </div>
        <button onClick={startSync} disabled={status?.running}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#83764F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {status?.running ? 'Syncing...' : 'Start Sync'}
        </button>
      </div>

      {status && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Tracked', value: status.total?.toLocaleString() ?? '0', color: '#1a1817' },
              { label: 'Synced', value: status.synced?.toLocaleString() ?? '0', color: '#2D6A4F' },
              { label: 'Pending', value: status.pending?.toLocaleString() ?? '0', color: '#83764F' },
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
              <p className="text-xs text-[#8E867C] mt-2">Current: {status.current?.currentBarcode} · {status.current?.synced}/{status.current?.total} processed</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
