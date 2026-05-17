/* Wedding Access · App Root */
const { useState, useEffect, useCallback } = React;

/* ── Logo cache (localStorage) ──────────────────────────────────
   Used only as an instant fallback while the network request loads.
   The real source of truth is always GET /branding (now public).  */
function cacheLogoUrl(url) {
  try {
    if (url) localStorage.setItem('wa_app_logo', url);
    else      localStorage.removeItem('wa_app_logo');
  } catch {}
}
function getCachedLogoUrl() {
  try { return localStorage.getItem('wa_app_logo') || null; } catch { return null; }
}

/* ── Splash screen ───────────────────────────────────────────── */
function SplashScreen({ logoUrl }) {
  return (
    <div className="wa-splash">
      <div style={{ animation: 'wa-monogram-fadein .9s ease both' }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Wedding Access"
            className="wa-splash-logo"
            style={{
              maxWidth: '200px',
              maxHeight: '130px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
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

/* ── App root ────────────────────────────────────────────────── */
function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  /* Synchronous first frame: read cache so splash shows logo instantly
     even before any network request completes.                         */
  const [splashLogoUrl, setSplashLogoUrl] = useState(getCachedLogoUrl);

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
    const id = setInterval(applyThemeByTime, 60000);
    return () => clearInterval(id);
  }, []);

  const applyBranding = useCallback((b) => {
    if (!b) return;
    setBranding(b);
    /* Always sync the splash logo with the live value */
    setSplashLogoUrl(b.appLogoUrl || null);
    cacheLogoUrl(b.appLogoUrl || null);
  }, []);

  const logout = useCallback(() => {
    WA.auth.logout();
    setUser(null);
    setBranding(null);
    /* Keep logo cache so the next splash still shows the logo */
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
    let cancelled = false;

    /* ── Branding fetch (public endpoint — no JWT needed) ────────
       Fires immediately on every device/browser/platform.
       This is the primary mechanism for showing the logo in the
       splash screen regardless of login state or cache state.      */
    WA.branding.get()
      .then(b => { if (!cancelled && b) applyBranding(b); })
      .catch(() => { /* network failure — cached logo already shown */ });

    /* ── Auth check (parallel) ───────────────────────────────── */
    if (!WA.auth.getToken()) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    WA.auth.me()
      .then(me => {
        if (cancelled) return null;
        setUser(me);
        /* Branding already fetched above; no second request needed */
        return null;
      })
      .catch(() => { if (!cancelled) WA.auth.logout(); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [applyBranding]);

  if (loading) return <SplashScreen logoUrl={splashLogoUrl} />;

  if (!user) {
    return (
      <LoginScreen
        branding={branding}
        onLogin={(me, token) => {
          WA.auth.setToken(token);
          setUser(me);
          refreshBranding();
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
