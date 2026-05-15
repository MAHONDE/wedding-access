/* Wedding Access · Screens */
const { useState, useEffect, useRef } = React;

/* ── Login ────────────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await WA.auth.login(email, password);
      onLogin(res.user, res.access_token);
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wa-login-wrap">
      <div className="wa-login-box">
        <div className="wa-login-logo">
          <h1>Wedding Access</h1>
          <p>Plateforme cérémonie · 4 Juillet 2026</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="wa-form-group">
            <label className="wa-form-label">Adresse e-mail</label>
            <input
              className="wa-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="prenom@example.com"
            />
          </div>
          <div className="wa-form-group">
            <label className="wa-form-label">Mot de passe</label>
            <input
              className="wa-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && <div className="wa-form-error">{error}</div>}
          <button
            className="wa-btn wa-btn-primary"
            style={{ width:'100%', justifyContent:'center', marginTop:'1.25rem', padding:'.75rem' }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */
function DashboardScreen({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    WA.guests.stats(user.ceremonyId || '').then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <div className="wa-stat-grid">
        <StatCard value={stats?.total ?? '—'}    label="Total invités" />
        <StatCard value={stats?.arrived ?? '—'}  label="Arrivés" color="var(--wa-success)" />
        <StatCard value={stats?.pending ?? '—'}  label="En attente" />
        <StatCard value={stats?.absent ?? '—'}   label="Absents" color="var(--wa-error)" />
      </div>
      <div className="wa-card">
        <div className="wa-card-title">Bienvenue, {user.firstName}</div>
        <p style={{ color:'var(--wa-muted)', fontSize:'13px', marginTop:'.25rem' }}>
          Utilisez le menu pour gérer les invités, scanner les QR codes et générer les invitations.
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="wa-stat">
      <div className="wa-stat-value" style={color ? { color } : {}}>{value}</div>
      <div className="wa-stat-label">{label}</div>
    </div>
  );
}

/* ── Guests ───────────────────────────────────────────────── */
function GuestsScreen({ user }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = (q) => {
    setLoading(true);
    WA.guests.list(user.ceremonyId || '', q)
      .then(setGuests)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  const debounceRef = useRef(null);
  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  };

  const statusBadge = (s) => {
    const map = { INVITED:'info', CONFIRMED:'success', ARRIVED:'success', ABSENT:'error', PENDING:'muted' };
    const labels = { INVITED:'Invité', CONFIRMED:'Confirmé', ARRIVED:'Arrivé', ABSENT:'Absent', PENDING:'En attente' };
    return <span className={`wa-badge wa-badge-${map[s]||'muted'}`}>{labels[s]||s}</span>;
  };

  return (
    <div>
      <div className="wa-flex-between wa-mb">
        <input
          className="wa-input"
          style={{ maxWidth:'300px' }}
          placeholder="Rechercher un invité…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        <button className="wa-btn wa-btn-primary" onClick={() => setShowAdd(true)}>
          + Ajouter un invité
        </button>
      </div>

      {showAdd && (
        <AddGuestForm
          ceremonyId={user.ceremonyId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(search); }}
        />
      )}

      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Table</th>
                <th>Statut</th>
                <th>QR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Chargement…</td></tr>
              )}
              {!loading && guests.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Aucun invité trouvé</td></tr>
              )}
              {guests.map(g => (
                <tr key={g.id}>
                  <td style={{ fontWeight:500 }}>{g.lastName}</td>
                  <td>{g.firstName}</td>
                  <td>{g.tableNumber || <span className="wa-text-muted">—</span>}</td>
                  <td>{statusBadge(g.entryStatus)}</td>
                  <td>
                    {g.qrCode
                      ? <span className="wa-badge wa-badge-success">✓ Généré</span>
                      : <span className="wa-badge wa-badge-muted">Non généré</span>
                    }
                  </td>
                  <td>
                    <button
                      className="wa-btn wa-btn-ghost"
                      style={{ fontSize:'12px', padding:'.25rem .5rem' }}
                      onClick={() => WA.qr.generate(g.id).then(() => load(search)).catch(e => alert(e.message))}
                    >
                      QR
                    </button>
                    <button
                      className="wa-btn wa-btn-ghost"
                      style={{ fontSize:'12px', padding:'.25rem .5rem', marginLeft:'.25rem' }}
                      onClick={() => window.open(WA.invitations.download(g.id), '_blank')}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddGuestForm({ ceremonyId, onClose, onSaved }) {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', tableNumber:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await WA.guests.create({ ...form, ceremonyId });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wa-card wa-mb" style={{ maxWidth:'480px' }}>
      <div className="wa-card-title">Ajouter un invité</div>
      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem', marginTop:'1rem' }}>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Prénom *</label>
            <input className="wa-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Nom *</label>
            <input className="wa-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">E-mail</label>
            <input className="wa-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Téléphone</label>
            <input className="wa-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">N° de table</label>
            <input className="wa-input" value={form.tableNumber} onChange={e => set('tableNumber', e.target.value)} />
          </div>
        </div>
        {err && <div className="wa-form-error" style={{ marginTop:'.5rem' }}>{err}</div>}
        <div className="wa-flex wa-gap-sm" style={{ marginTop:'1rem' }}>
          <button className="wa-btn wa-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
          <button className="wa-btn wa-btn-ghost" type="button" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

/* ── Invitations ──────────────────────────────────────────── */
function InvitationsScreen({ user }) {
  return (
    <div className="wa-card">
      <div className="wa-card-title">Gestion des invitations PDF</div>
      <p style={{ color:'var(--wa-muted)', fontSize:'13px', marginTop:'.5rem' }}>
        Accédez à la liste des invités pour générer et télécharger les invitations individuelles.
      </p>
    </div>
  );
}

/* ── Seating ──────────────────────────────────────────────── */
function SeatingScreen({ user }) {
  return (
    <div className="wa-card">
      <div className="wa-card-title">Plan de table</div>
      <p style={{ color:'var(--wa-muted)', fontSize:'13px', marginTop:'.5rem' }}>
        La gestion du plan de table sera disponible ici.
      </p>
    </div>
  );
}

/* ── History ──────────────────────────────────────────────── */
function HistoryScreen({ user }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    WA.scan.history(user.ceremonyId || '', page)
      .then(r => setScans(r.data || r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Invité</th>
                <th>Résultat</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Chargement…</td></tr>}
              {!loading && scans.length === 0 && <tr><td colSpan="4" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Aucun scan enregistré</td></tr>}
              {scans.map((s, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace:'nowrap' }}>{new Date(s.scannedAt).toLocaleString('fr-FR')}</td>
                  <td>{s.guest ? `${s.guest.firstName} ${s.guest.lastName}` : '—'}</td>
                  <td>
                    <span className={`wa-badge wa-badge-${s.result === 'OK' ? 'success' : 'error'}`}>
                      {s.result}
                    </span>
                  </td>
                  <td>{s.scannedBy?.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Users (SUPER_ADMIN only) ─────────────────────────────── */
function UsersScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    WA.users.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Chargement…</td></tr>}
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td><span className="wa-badge wa-badge-info">{u.role?.replace(/_/g,' ')}</span></td>
                  <td><span className={`wa-badge wa-badge-${u.isActive ? 'success' : 'muted'}`}>{u.isActive ? 'Actif' : 'Inactif'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
