/* Wedding Access · App Root */
const { useState, useEffect, useCallback } = React;

/* ── Logo cache ──────────────────────────────────────────────────
   Instant frame-0 display while the network request loads.
   The authoritative source is always GET /branding (public).      */
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
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [branding, setBranding] = useState(null);

  /* Frame-0 logo: shown immediately from cache before any network */
  const [splashLogoUrl, setSplashLogoUrl] = useState(getCachedLogoUrl);

  /* Auto theme switch */
  useEffect(() => {
    function applyThemeByTime() {
      const h = new Date().getHours() * 60 + new Date().getMinutes();
      const t = h >= 17 * 60 + 30 ? 'night' : 'day';
      if (document.body.dataset.theme !== t) document.body.dataset.theme = t;
    }
    applyThemeByTime();
    const id = setInterval(applyThemeByTime, 60000);
    return () => clearInterval(id);
  }, []);

  const applyBranding = useCallback((b) => {
    if (!b) return;
    setBranding(b);
    setSplashLogoUrl(b.appLogoUrl || null);
    cacheLogoUrl(b.appLogoUrl || null);
  }, []);

  const logout = useCallback(() => {
    WA.auth.logout();
    setUser(null);
    setBranding(null);
  }, []);

  const refreshBranding = useCallback(() => {
    WA.branding.get().then(b => { if (b) applyBranding(b); }).catch(() => {});
  }, [applyBranding]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('wa:auth-expired', handler);
    return () => window.removeEventListener('wa:auth-expired', handler);
  }, [logout]);

  useEffect(() => {
    /* GET /branding is public — always fetch it, no token needed.
       GET /auth/me     — only if a token is present.

       We wait for BOTH promises to settle before hiding the splash.
       This guarantees the logo is always visible during the splash,
       regardless of network speed, device, or browser.              */

    const brandingPromise = WA.branding.get().catch(() => null);

    const authPromise = WA.auth.getToken()
      ? WA.auth.me().catch(() => { WA.auth.logout(); return null; })
      : Promise.resolve(null);

    Promise.all([brandingPromise, authPromise]).then(([b, me]) => {
      if (b)  applyBranding(b);
      if (me) setUser(me);
    }).finally(() => setLoading(false));
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
