import { useState, useEffect } from 'react';
import api from '../api/client';

export default function SettingsPage() {
  const [s, setS] = useState<any>({}); const [loading, setLoading] = useState(true); const [saved, setSaved] = useState(false);
  useEffect(() => { api.get('/settings').then(r => { setS(r.data.data); setLoading(false); }); }, []);
  const save = async () => { await api.put('/settings', s); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-1" style={{ color: 'var(--taupe)' }}>Configuration</p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--obsidian)' }}>Settings</h2>
      </div>

      <div className="bg-white rounded-xl p-6 max-w-md" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-5" style={{ color: 'var(--taupe)' }}>Auto-Sync Pipeline</p>
        <p className="text-[12px] mb-5" style={{ color: 'var(--taupe)' }}>Runs sequentially: Catalog Sync → Image Download → Vector Index</p>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.1em] font-semibold mb-2" style={{ color: 'var(--taupe)' }}>Interval (minutes)</label>
            <div className="flex items-center gap-4">
              <input type="range" min={1} max={120} value={s.catalogSyncIntervalMin || 30} className="flex-1" style={{ accentColor: 'var(--gold)' }}
                onChange={e => setS({ ...s, catalogSyncIntervalMin: Number(e.target.value) })} />
              <span className="text-lg font-semibold w-10 text-right" style={{ color: 'var(--obsidian)' }}>{s.catalogSyncIntervalMin || 30}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--obsidian)' }}>Enable Auto-Sync</p>
              <p className="text-[11px]" style={{ color: 'var(--taupe)' }}>Pipeline runs automatically on schedule</p>
            </div>
            <button onClick={() => setS({ ...s, catalogSyncEnabled: !s.catalogSyncEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${s.catalogSyncEnabled ? '' : 'bg-gray-300'}`}
              style={{ background: s.catalogSyncEnabled ? 'var(--gold)' : undefined }}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${s.catalogSyncEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <button onClick={save}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: 'var(--gold)' }}>
            {saved ? 'Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
