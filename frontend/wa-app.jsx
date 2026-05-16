/* Wedding Access · App Root */
const { useState, useEffect, useCallback } = React;

function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  const logout = useCallback(() => {
    WA.auth.logout();
    setUser(null);
    setBranding(null);
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
      <LoginScreen onLogin={(me, token) => {
        WA.auth.setToken(token);
        setUser(me);
        WA.branding.get().then(b => { if (b) setBranding(b); }).catch(() => {});
      }} />
    );
  }

  return <Shell user={user} branding={branding} onLogout={logout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
