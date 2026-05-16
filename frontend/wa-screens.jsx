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
    WA.guests.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <div className="wa-stat-grid">
        <StatCard value={stats?.total ?? '—'}       label="Total invités" />
        <StatCard value={stats?.totalSeats ?? '—'}  label="Places totales" />
        <StatCard value={stats?.arrived ?? '—'}     label="Arrivés" color="var(--wa-success)" />
        <StatCard value={stats?.notArrived ?? '—'}  label="Non arrivés" />
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
  const [ceremonyId, setCeremonyId] = useState('');

  useEffect(() => {
    WA.ceremonies.list()
      .then(cs => { if (cs.length > 0) setCeremonyId(cs[0].id); })
      .catch(() => {});
  }, []);

  const load = (q) => {
    setLoading(true);
    WA.guests.list(ceremonyId, q)
      .then(setGuests)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, [ceremonyId]);

  const debounceRef = useRef(null);
  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  };

  const statusBadge = (s) => {
    const map = { ARRIVED:'success', NOT_ARRIVED:'muted' };
    const labels = { ARRIVED:'Arrivé', NOT_ARRIVED:'Non arrivé' };
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
          ceremonyId={ceremonyId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(search); }}
        />
      )}

      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Invité</th>
                <th>Table</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Chargement…</td></tr>
              )}
              {!loading && guests.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Aucun invité trouvé</td></tr>
              )}
              {guests.map(g => (
                <tr key={g.id}>
                  <td style={{ fontWeight:500 }}>
                    {g.primaryName}
                    {g.companionName && <span style={{ color:'var(--wa-muted)', fontWeight:400 }}> & {g.companionName}</span>}
                  </td>
                  <td>{g.table?.name || <span className="wa-text-muted">—</span>}</td>
                  <td>{statusBadge(g.entryStatus)}</td>
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
                      onClick={() => WA.invitations.generateAndDownload(g.id).catch(e => alert(e.message))}
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
  const [form, setForm] = useState({ primaryName:'', type:'INDIVIDUAL', companionName:'', email:'', phone:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const payload = { primaryName: form.primaryName, type: form.type, email: form.email || null, phone: form.phone || null, ceremonyId };
      if (form.type === 'COUPLE') payload.companionName = form.companionName;
      await WA.guests.create(payload);
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
          <div className="wa-form-group" style={{ margin:0, gridColumn:'1/-1' }}>
            <label className="wa-form-label">Nom complet *</label>
            <input className="wa-input" value={form.primaryName} onChange={e => set('primaryName', e.target.value)} required placeholder="Prénom Nom" />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Type</label>
            <select className="wa-input" value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="INDIVIDUAL">Individuel</option>
              <option value="COUPLE">Couple</option>
            </select>
          </div>
          {form.type === 'COUPLE' && (
            <div className="wa-form-group" style={{ margin:0 }}>
              <label className="wa-form-label">Nom du/de la partenaire *</label>
              <input className="wa-input" value={form.companionName} onChange={e => set('companionName', e.target.value)} required={form.type === 'COUPLE'} placeholder="Prénom Nom" />
            </div>
          )}
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">E-mail</label>
            <input className="wa-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Téléphone</label>
            <input className="wa-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
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
    WA.scan.history('', page)
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
                  <td>{s.guest?.primaryName || '—'}</td>
                  <td>
                    <span className={`wa-badge wa-badge-${s.result === 'VALID' ? 'success' : 'error'}`}>
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
