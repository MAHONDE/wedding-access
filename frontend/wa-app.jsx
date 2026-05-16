/* Wedding Access · App Root */
const { useState, useEffect, useCallback } = React;

function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

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

  const logout = useCallback(() => {
    WA.auth.logout();
    setUser(null);
    setBranding(null);
  }, []);

  const refreshBranding = useCallback(() => {
    WA.branding.get().then(b => { if (b) setBranding(b); }).catch(() => {});
  }, []);

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
      .then(b => { if (b) setBranding(b); })
      .catch(() => WA.auth.logout())
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <LoginScreen
        branding={branding}
        onLogin={(me, token) => {
          WA.auth.setToken(token);
          setUser(me);
          WA.branding.get().then(b => { if (b) setBranding(b); }).catch(() => {});
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
