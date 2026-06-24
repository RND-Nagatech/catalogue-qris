import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function CatalogSyncPage() {
  const [status, setStatus] = useState<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchStatus = async () => {
    const res = await api.get('/catalog/status');
    const s = res.data.data;
    setStatus(s);
    if (!s?.running && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => { fetchStatus(); }, []);

  const startSync = async () => {
    await api.post('/catalog/sync');
    intervalRef.current = setInterval(fetchStatus, 2000);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#8E867C] mb-1 font-medium">Master Database</p>
          <h2 className="text-2xl font-bold text-[#1a1817]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Catalog Sync</h2>
          <p className="text-sm text-[#8E867C] mt-1">ETL from store databases to decrypted Master Catalog</p>
        </div>
        <button onClick={startSync} disabled={status?.running}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#83764F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {status?.running ? 'Syncing...' : 'Start Sync'}
        </button>
      </div>

      {status && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#EFEDE8]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E867C] mb-2 font-medium">Status</div>
              <div className="flex items-center gap-2">
                {status.running ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-lg font-bold text-[#83764F]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Running</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    <span className="text-lg font-bold text-green-700" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Idle</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#EFEDE8]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E867C] mb-2 font-medium">Total Indexed</div>
              <div className="text-3xl font-bold tracking-tight text-[#1a1817]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {status.totalUpserted?.toLocaleString() ?? '···'}
              </div>
            </div>
          </div>

          {status.running && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#EFEDE8]">
              <p className="text-sm text-[#8E867C]">Processing: <span className="font-semibold text-[#1a1817]">{status.storeName}</span> · Store {status.store}/{status.storeTotal}</p>
              <div className="w-full h-1.5 bg-[#EFEDE8] rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full animate-pulse" style={{ width: '100%', background: 'linear-gradient(90deg, #83764F, #A6956D)' }} />
              </div>
              <div className="flex gap-6 mt-3 text-sm">
                <span className="text-[#8E867C]">Fetched <strong className="text-[#1a1817]">{status.fetched?.toLocaleString()}</strong></span>
                <span className="text-[#8E867C]">Upserted <strong className="text-[#1a1817]">{status.upserted?.toLocaleString()}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
