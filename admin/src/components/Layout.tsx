import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/stores', label: 'Stores' },
  { to: '/sync-images', label: 'Sync Images' },
  { to: '/catalog-sync', label: 'Catalog Sync' },
  { to: '/image-index', label: 'Image Index' },
  { to: '/settings', label: 'Settings' },
  { to: '/whatsapp', label: 'WhatsApp' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ background: 'var(--ivory)' }}>
      {/* Sidebar */}
      <aside className="w-[232px] flex-shrink-0 flex flex-col" style={{ background: 'var(--obsidian)', color: '#A8A29E' }}>
        {/* Brand */}
        <div className="px-5 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h1 className="text-xl tracking-[0.02em] mb-0.5" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--gold)', fontWeight: 600 }}>
            Nagagold Catalogue
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#5C5750' }}>
            Operations Admin
          </p>
          {/* Gold accent line */}
          <div className="mt-3 h-[2px] w-10 rounded-full" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-[6px] text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-[#E8E4DB]'
                    : 'text-[#78716C] hover:text-[#A8A29E]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(201,169,92,0.10)', borderLeft: '2px solid var(--gold)' }
                  : { borderLeft: '2px solid transparent' }
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] tracking-wider" style={{ color: '#44403C' }}>NAGATECH</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
