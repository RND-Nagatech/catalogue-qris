import { useState, useEffect } from 'react';
import api from '../api/client';
interface Store { id: string; name: string; mongoUri: string; dbName: string; firebaseCode: string; }
const MASTER_PASSWORD = 'b3r4sput1h';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Store> | null>(null);
  const [pw, setPw] = useState(''); const [unlocked, setUnlocked] = useState(false); const [pwErr, setPwErr] = useState(false);

  const fetch = async () => { const r = await api.get('/stores'); setStores(r.data.data || []); setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const open = (s?: Store) => { setModal(s ? { ...s } : { name: '', mongoUri: '', dbName: '', firebaseCode: '' }); setPw(''); setUnlocked(false); setPwErr(false); };
  const unlock = () => { if (pw === MASTER_PASSWORD) { setUnlocked(true); setPwErr(false); } else setPwErr(true); };
  const save = async () => { if (!modal?.name || !modal?.mongoUri || !modal?.dbName) return; modal.id ? await api.put(`/stores/${modal.id}`, modal) : await api.post('/stores', modal); setModal(null); fetch(); };
  const remove = async (id: string) => { if (!confirm('Delete this store?')) return; await api.delete(`/stores/${id}`); fetch(); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-1" style={{ color: 'var(--taupe)' }}>Configuration</p>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--obsidian)' }}>Stores</h2>
        </div>
        <button onClick={() => open()} className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110" style={{ background: 'var(--gold)', fontFamily: 'Inter, sans-serif' }}>+ Add Store</button>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                {['Name', 'Database', 'Firebase', 'MongoDB URI', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.1em] font-semibold" style={{ color: 'var(--taupe)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center" style={{ color: 'var(--taupe)' }}>No stores configured.</td></tr>
              ) : stores.map(s => (
                <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid var(--stone)' }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--obsidian)' }}>{s.name}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px]" style={{ color: 'var(--taupe)' }}>{'•'.repeat(12)}</td>
                  <td className="px-5 py-3.5"><span className="px-2.5 py-0.5 rounded text-[11px] font-medium" style={{ background: 'var(--ivory)', color: 'var(--taupe)' }}>{s.firebaseCode || '—'}</span></td>
                  <td className="px-5 py-3.5 font-mono text-[11px]" style={{ color: 'var(--taupe)' }}>{'•'.repeat(28)}</td>
                  <td className="px-5 py-3.5 flex gap-3">
                    <button onClick={() => open(s)} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--gold-dark)' }}>Edit</button>
                    <button onClick={() => remove(s.id)} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--garnet)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 className="text-xl font-semibold mb-5" style={{ color: 'var(--obsidian)' }}>{modal.id ? 'Edit Store' : 'New Store'}</h3>
            <div className="space-y-4">
              <Field label="Store Name" value={modal.name || ''} onChange={v => setModal({ ...modal, name: v })} placeholder="FANCY GOLD & JEWELLERY" />
              <Field label="Database Name" value={modal.dbName || ''} onChange={v => setModal({ ...modal, dbName: v })} placeholder="db_fcyjewellery" locked={!unlocked} />
              <Field label="Firebase Code" value={modal.firebaseCode || ''} onChange={v => setModal({ ...modal, firebaseCode: v })} placeholder="INT" />
              <div>
                <label className="block text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5" style={{ color: 'var(--taupe)' }}>MongoDB URI</label>
                {unlocked ? (
                  <Field full label="" value={modal.mongoUri || ''} onChange={v => setModal({ ...modal, mongoUri: v })} placeholder="mongodb://user:pass@host" />
                ) : (
                  <div className="flex gap-2">
                    <input type="password" className="flex-1 rounded-lg border px-3.5 py-2.5 text-[13px] bg-gray-50" style={{ borderColor: 'var(--stone)' }} placeholder="Master password" value={pw} onChange={e => { setPw(e.target.value); setPwErr(false); }} onKeyDown={e => e.key === 'Enter' && unlock()} />
                    <button onClick={unlock} className="px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white transition-all" style={{ background: 'var(--gold)' }}>Unlock</button>
                  </div>
                )}
                {pwErr && <p className="text-[11px] mt-1" style={{ color: 'var(--garnet)' }}>Incorrect password</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--stone)' }}>
              <button onClick={save} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110" style={{ background: 'var(--gold)' }}>Save Store</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all" style={{ background: 'var(--ivory)', color: 'var(--taupe)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, locked, full }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder: string; locked?: boolean; full?: boolean;
}) {
  return (
    <div>
      {label ? <label className="block text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5" style={{ color: 'var(--taupe)' }}>{label}</label> : null}
      {locked ? (
        <input className="w-full rounded-lg border px-3.5 py-2.5 text-[13px] bg-gray-50" style={{ borderColor: 'var(--stone)', color: 'var(--taupe)' }} value="••••••••" disabled />
      ) : (
        <input className="w-full rounded-lg border px-3.5 py-2.5 text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20 focus:border-[var(--gold)]" style={{ borderColor: 'var(--stone)', fontFamily: full ? "'JetBrains Mono', monospace" : 'Inter' }}
          value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}
