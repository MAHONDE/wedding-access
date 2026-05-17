/* Wedding Access · App Root */
const { useState, useEffect, useCallback } = React;

/* Persist and restore the app logo URL across sessions so the splash
   screen shows the real logo immediately on the next load — before any
   network request completes. */
function cacheLogoUrl(url) {
  try {
    if (url) localStorage.setItem('wa_app_logo', url);
    else      localStorage.removeItem('wa_app_logo');
  } catch {}
}
function getCachedLogoUrl() {
  try { return localStorage.getItem('wa_app_logo') || null; } catch { return null; }
}

function SplashScreen({ logoUrl }) {
  return (
    <div className="wa-splash">
      <div style={{ animation: 'wa-monogram-fadein .9s ease both' }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Wedding Access"
            style={{
              maxWidth: '200px',
              maxHeight: '130px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
              /* Night mode: subtle gold glow applied via CSS */
            }}
            className="wa-splash-logo"
          />
        ) : (
          <WeddingMonogram size={110} />
        )}
      </div>
      <p className="wa-splash-title">Wedding Access</p>
      <div className="wa-splash-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  /* Logo URL from last session — available synchronously for the splash */
  const [splashLogoUrl] = useState(getCachedLogoUrl);

  /* Auto theme switch: jour avant 17h30, soir à partir de 17h30 */
  useEffect(() => {
    function applyThemeByTime() {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const target = minutes >= 17 * 60 + 30 ? 'night' : 'day';
      if (document.body.dataset.theme !== target) {
        document.body.dataset.theme = target;
      }
    }
    applyThemeByTime();
    const interval = setInterval(applyThemeByTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const applyBranding = useCallback((b) => {
    if (!b) return;
    setBranding(b);
    cacheLogoUrl(b.appLogoUrl || null);
  }, []);

  const logout = useCallback(() => {
    WA.auth.logout();
    setUser(null);
    setBranding(null);
    /* Keep logo cache on logout — it will show next time on the splash */
  }, []);

  const refreshBranding = useCallback(() => {
    WA.branding.get()
      .then(b => { if (b) applyBranding(b); })
      .catch(() => {});
  }, [applyBranding]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('wa:auth-expired', handler);
    return () => window.removeEventListener('wa:auth-expired', handler);
  }, [logout]);

  useEffect(() => {
    if (!WA.auth.getToken()) { setLoading(false); return; }
    WA.auth.me()
      .then(me => {
        setUser(me);
        return WA.branding.get().catch(() => null);
      })
      .then(b => { if (b) applyBranding(b); })
      .catch(() => WA.auth.logout())
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SplashScreen logoUrl={splashLogoUrl} />;

  if (!user) {
    return (
      <LoginScreen
        branding={branding}
        onLogin={(me, token) => {
          WA.auth.setToken(token);
          setUser(me);
          WA.branding.get()
            .then(b => { if (b) applyBranding(b); })
            .catch(() => {});
        }}
      />
    );
  }

  return (
    <Shell
      user={user}
      branding={branding}
      onBrandingUpdate={refreshBranding}
      onLogout={logout}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
