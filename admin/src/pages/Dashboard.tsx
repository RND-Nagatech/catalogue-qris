import { useState, useEffect } from 'react';
import api from '../api/client';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}>
      <p className="text-[11px] uppercase tracking-[0.12em] font-medium mb-3" style={{ color: 'var(--taupe)' }}>{label}</p>
      <p className="text-3xl tracking-tight font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--obsidian)' }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: 'var(--taupe)' }}>{sub}</p>}
    </div>
  );
}

function PipelineCard({ unified }: { unified: any }) {
  const steps = [
    { key: 'catalog', label: 'Catalog Sync' },
    { key: 'images', label: 'Image Download' },
    { key: 'index', label: 'Vector Index' },
  ];
  const currentIdx = unified?.running ? steps.findIndex(s => s.key === unified.step) : -1;

  return (
    <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-[11px] uppercase tracking-[0.12em] font-medium mb-4" style={{ color: 'var(--taupe)' }}>Pipeline Status</p>
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: unified?.running && i === currentIdx
                    ? 'var(--gold)'
                    : unified?.running && i < currentIdx
                    ? 'var(--emerald)'
                    : '#E8E4DB'
                }}
              />
              <span className="text-[12px] font-medium" style={{ color: i <= currentIdx ? 'var(--text)' : 'var(--taupe)' }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div className="w-6 h-px" style={{ background: 'var(--stone)' }} />}
          </div>
        ))}
        {/* Running indicator */}
        {unified?.running && (
          <span className="text-[11px] font-medium animate-pulse ml-2" style={{ color: 'var(--gold)' }}>
            running {unified.step}...
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [health, products, syncStatus, stores] = await Promise.all([
          api.get('/health'),
          api.get('/products?limit=1').catch(() => ({ data: { meta: { total: 0 } } })),
          api.get('/sync/status'),
          api.get('/stores'),
        ]);
        setStats({
          health: health.data,
          productsTotal: products.data?.meta?.total || 0,
          sync: syncStatus.data?.data,
          stores: stores.data?.data?.length || 0,
        });
      } catch (e) { /* silent */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 shimmer rounded-xl" />)}</div>
        <div className="h-20 shimmer rounded-xl" />
        <div className="grid grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 shimmer rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-1" style={{ color: 'var(--taupe)' }}>System Overview</p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--obsidian)' }}>Dashboard</h2>
      </div>

      {/* Pipeline Status */}
      <div className="mb-5">
        <PipelineCard unified={stats.health?.unified} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Products Indexed" value={(stats.productsTotal || 0).toLocaleString()} sub="Master Catalog" />
        <StatCard label="Images Synced" value={stats.sync?.synced?.toLocaleString() ?? '—'} sub="From Firebase" />
        <StatCard label="Stores Connected" value={String(stats.stores)} sub="Active data sources" />
      </div>

      {/* Info rows */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-4" style={{ color: 'var(--taupe)' }}>System</p>
          <div className="space-y-2.5 text-[13px]">
            {[
              ['Health', stats.health?.status, 'var(--emerald)'],
              ['Auto-Sync', stats.health?.cron?.intervalMin > 0 ? `Every ${stats.health.cron.intervalMin} min` : 'Disabled', 'var(--text)'],
              ['WhatsApp Bot', stats.health?.whatsapp?.online ? 'Online' : 'Offline', stats.health?.whatsapp?.online ? 'var(--emerald)' : 'var(--garnet)'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--stone)' }}>
                <span style={{ color: 'var(--taupe)' }}>{label}</span>
                <span className="font-medium" style={{ color }}>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-4" style={{ color: 'var(--taupe)' }}>Last Activity</p>
          <div className="space-y-2.5 text-[13px]">
            {[
              ['Pipeline', stats.health?.unified?.lastRun ? new Date(stats.health.unified.lastRun).toLocaleTimeString('id-ID') : 'Never'],
              ['Image Sync', stats.sync?.lastSync ? new Date(stats.sync.lastSync).toLocaleTimeString('id-ID') : 'Never'],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--stone)' }}>
                <span style={{ color: 'var(--taupe)' }}>{label}</span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
