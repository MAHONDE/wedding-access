/* Wedding Access · Shell (sidebar + layout) */
const { useState } = React;

const NAV = [
  { id: 'dashboard',   label: 'Tableau de bord', icon: '◈', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'guests',      label: 'Invités',          icon: '◉', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  { id: 'scanner',     label: 'Scanner QR',       icon: '⬡', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'] },
  { id: 'invitations', label: 'Invitations PDF',  icon: '✉', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'seating',     label: 'Plan de table',    icon: '⊞', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'history',     label: 'Historique scans', icon: '◷', roles: ['SUPER_ADMIN','ADMIN_VIN_HONNEUR'] },
  { id: 'users',       label: 'Utilisateurs',     icon: '◎', roles: ['SUPER_ADMIN'] },
];

function Shell({ user, branding, onLogout }) {
  const [screen, setScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = NAV.filter(n => n.roles.includes(user.role));

  return (
    <div className="wa-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`wa-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="wa-sidebar-logo">
          <h1>{branding?.coupleName || 'Wedding Access'}</h1>
          <p>{branding?.eventDate ? new Date(branding.eventDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '4 Juillet 2026'}</p>
        </div>

        <nav className="wa-nav">
          {visibleNav.map(item => (
            <button
              key={item.id}
              className={`wa-nav-item${screen === item.id ? ' active' : ''}`}
              onClick={() => { setScreen(item.id); setSidebarOpen(false); }}
            >
              <span style={{ fontSize:'16px', width:'20px', textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="wa-sidebar-footer">
          <div style={{ fontSize:'12px', color:'var(--wa-muted)', marginBottom:'.5rem', paddingLeft:'.25rem' }}>
            {user.firstName} {user.lastName}
            <br />
            <span style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'.05em' }}>{user.role?.replace(/_/g, ' ')}</span>
          </div>
          <button className="wa-btn wa-btn-ghost" style={{ width:'100%', justifyContent:'center' }} onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="wa-main">
        <header className="wa-topbar">
          <button
            className="wa-btn wa-btn-ghost"
            style={{ display:'none', padding:'.375rem' }}
            id="sidebar-toggle"
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
          {screen === 'dashboard'   && <DashboardScreen user={user} />}
          {screen === 'guests'      && <GuestsScreen user={user} />}
          {screen === 'scanner'     && <ScannerScreen user={user} />}
          {screen === 'invitations' && <InvitationsScreen user={user} />}
          {screen === 'seating'     && <SeatingScreen user={user} />}
          {screen === 'history'     && <HistoryScreen user={user} />}
          {screen === 'users'       && <UsersScreen user={user} />}
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
    <button className="wa-btn wa-btn-ghost" onClick={toggle} title="Changer de thème">
      {theme === 'day' ? '☽' : '☀'}
    </button>
  );
}
