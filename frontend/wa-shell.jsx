/* Wedding Access · Shell (sidebar + layout) */
const { useState } = React;

const NAV_ITEMS = [
  /* ── Gestion ── */
  { id: 'dashboard',   label: 'Tableau de bord',  icon: '◈', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'guests',      label: 'Invités',           icon: '◉', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  { id: 'invitations', label: 'Invitations PDF',   icon: '✉', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'templates',   label: 'Templates',         icon: '◧', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'seating',     label: 'Plan de table',     icon: '⊞', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  /* ── Événement ── */
  { id: 'scanner',     label: 'Scanner QR',        icon: '⬡', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  { id: 'history',     label: 'Historique scans',  icon: '◷', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  /* ── Administration ── */
  { id: 'users',       label: 'Utilisateurs',      icon: '◎', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'branding',    label: 'Identité visuelle', icon: '✦', roles: ['SUPER_ADMIN'] },
];

const NAV_SECTIONS = {
  dashboard:   'Gestion',
  guests:      'Gestion',
  invitations: 'Gestion',
  templates:   'Gestion',
  seating:     'Gestion',
  scanner:     'Événement',
  history:     'Événement',
  users:       'Administration',
  branding:    'Administration',
};

function Shell({ user, branding, onBrandingUpdate, onLogout }) {
  const [screen, setScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user.role));

  /* Group nav items by section */
  const sections = [];
  let lastSection = null;
  visibleNav.forEach(item => {
    const sec = NAV_SECTIONS[item.id];
    if (sec !== lastSection) { sections.push({ section: sec, items: [] }); lastSection = sec; }
    sections[sections.length - 1].items.push(item);
  });

  /* App logo takes priority; fallback to default SVG monogram */
  const appLogoUrl = branding?.appLogoUrl || null;

  const navigate = (id) => { setScreen(id); setSidebarOpen(false); };

  return (
    <div className="wa-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`wa-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="wa-sidebar-logo">
          {appLogoUrl ? (
            <div className="wa-sidebar-app-logo">
              <img
                src={appLogoUrl}
                alt="Wedding Access"
                style={{ maxWidth:'100px', maxHeight:'64px', objectFit:'contain', display:'block', margin:'0 auto' }}
              />
            </div>
          ) : (
            <WeddingMonogram size={70} />
          )}
          <h1 style={{ marginTop:'.5rem' }}>{branding?.appName || 'Wedding Access'}</h1>
          <p style={{ fontFamily:'var(--wa-font-serif)', fontStyle:'italic' }}>4 Juillet 2026</p>
        </div>

        <nav className="wa-nav">
          {sections.map(({ section, items }) => (
            <div key={section}>
              <div className="wa-nav-section">{section}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`wa-nav-item${screen === item.id ? ' active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  <span style={{ fontSize:'15px', width:'18px', textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="wa-sidebar-footer">
          <div style={{ fontSize:'12px', color:'var(--wa-muted)', marginBottom:'.5rem', paddingLeft:'.25rem' }}>
            <span style={{ fontWeight:500, color:'var(--wa-charcoal)' }}>{user.firstName} {user.lastName}</span>
            <br />
            <span style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'.05em' }}>
              {user.role?.replace(/_/g, ' ')}
            </span>
          </div>
          <button className="wa-btn wa-btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:'12px' }} onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="wa-main">
        <header className="wa-topbar">
          <button
            className="wa-btn wa-btn-ghost"
            id="sidebar-toggle"
            style={{ padding:'.375rem' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <span className="wa-topbar-title">
            {visibleNav.find(n => n.id === screen)?.label || 'Wedding Access'}
          </span>
          <ThemeToggle />
        </header>

        <div className="wa-page">
          {screen === 'dashboard'   && <DashboardScreen user={user} branding={branding} />}
          {screen === 'guests'      && <GuestsScreen user={user} />}
          {screen === 'invitations' && <InvitationsScreen user={user} />}
          {screen === 'templates'   && <TemplatesScreen user={user} />}
          {screen === 'seating'     && <SeatingScreen user={user} />}
          {screen === 'scanner'     && <ScannerScreen user={user} branding={branding} />}
          {screen === 'history'     && <HistoryScreen user={user} />}
          {screen === 'users'       && <UsersScreen user={user} />}
          {screen === 'branding'    && <BrandingScreen user={user} branding={branding} onUpdate={onBrandingUpdate} />}
        </div>
      </main>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(document.body.dataset.theme || 'day');
  const toggle = () => {
    const next = theme === 'day' ? 'night' : 'day';
    document.body.dataset.theme = next;
    setTheme(next);
  };
  return (
    <button className="wa-btn wa-btn-ghost" onClick={toggle} title="Changer de thème" style={{ fontSize:'16px', padding:'.375rem .5rem' }}>
      {theme === 'day' ? '☽' : '☀'}
    </button>
  );
}
