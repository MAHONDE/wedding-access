/* Wedding Access · Screens v3 */
const { useState, useEffect, useRef, useCallback } = React;

/* ─── Ceremony cache (shared across screen mounts) ─────────── */
let _cerCache = null;
let _cerCacheAt = 0;
const CER_TTL = 120000;

/* ─── Helpers ──────────────────────────────────────────────── */
function cereomonyLabel(type) {
  return type === 'VIN_HONNEUR' ? 'Vin d\'honneur' : 'Dîner';
}

function useCeremonies(user) {
  const [ceremonies, setCeremonies] = useState(_cerCache || []);
  const [loading, setLoading] = useState(!_cerCache);

  useEffect(() => {
    if (_cerCache && Date.now() - _cerCacheAt < CER_TTL) {
      setCeremonies(_cerCache);
      setLoading(false);
      return;
    }
    WA.ceremonies.list()
      .then(cs => { _cerCache = cs; _cerCacheAt = Date.now(); setCeremonies(cs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scoped = user.role === 'SUPER_ADMIN'
    ? ceremonies
    : ceremonies.filter(c => c.type === user.ceremonyScope);

  return { ceremonies: scoped, loading };
}

/* ─── ConfirmDeleteModal ────────────────────────────────────── */
function ConfirmDeleteModal({ guest, onConfirm, onCancel, loading }) {
  return (
    <div className="wa-modal-overlay" onClick={onCancel}>
      <div className="wa-modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom:'.75rem', color:'var(--wa-charcoal)' }}>Supprimer l'invité</h3>
        <p style={{ color:'var(--wa-muted)', fontSize:'14px', marginBottom:'.5rem' }}>
          Êtes-vous sûr de vouloir supprimer{' '}
          <strong style={{ color:'var(--wa-charcoal)' }}>
            {guest.primaryName}{guest.companionName ? ` & ${guest.companionName}` : ''}
          </strong> ?
        </p>
        <p style={{ color:'var(--wa-muted)', fontSize:'12px', marginBottom:'1.25rem' }}>
          Son QR code sera désactivé et ses invitations marquées obsolètes.
        </p>
        <div className="wa-flex wa-gap-sm" style={{ justifyContent:'flex-end' }}>
          <button className="wa-btn wa-btn-ghost" onClick={onCancel} disabled={loading}>Annuler</button>
          <button
            className="wa-btn"
            style={{ background:'var(--wa-error)', color:'#fff', border:'none' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── StatCard ──────────────────────────────────────────────── */
function StatCard({ value, label, color, small }) {
  return (
    <div className="wa-stat" style={small ? { padding:'.875rem' } : {}}>
      <div className="wa-stat-value" style={{ color: color || 'var(--wa-gold)', fontSize: small ? '1.75rem' : '2.25rem' }}>
        {value ?? '—'}
      </div>
      <div className="wa-stat-label">{label}</div>
    </div>
  );
}

/* ─── CeremonySelector ──────────────────────────────────────── */
function CeremonySelector({ ceremonies, value, onChange, locked }) {
  if (locked || ceremonies.length <= 1) {
    const c = ceremonies.find(x => x.id === value) || ceremonies[0];
    return (
      <span className="wa-badge wa-badge-gold" style={{ fontSize:'12px', padding:'4px 12px' }}>
        {c ? cereomonyLabel(c.type) : '—'}
      </span>
    );
  }
  return (
    <select className="wa-input" style={{ maxWidth:'200px' }} value={value} onChange={e => onChange(e.target.value)}>
      {ceremonies.map(c => (
        <option key={c.id} value={c.id}>{cereomonyLabel(c.type)}</option>
      ))}
    </select>
  );
}

/* ─── LoginScreen ──────────────────────────────────────────── */
function LoginScreen({ branding, onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const monogramUrl = branding?.monogramPath
    ? WA.fileUrl(branding.monogramPath, 'branding')
    : null;

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
          <div className="wa-monogram-login">
            <WeddingMonogram logoUrl={monogramUrl} size={monogramUrl ? 160 : 80} />
          </div>
          <h1 style={{ marginTop: monogramUrl ? '.75rem' : '1rem' }}>{branding?.appName || 'Wedding Access'}</h1>
          <p>Plateforme de gestion cérémonie</p>
          <FloralDivider />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="wa-form-group">
            <label className="wa-form-label">Adresse e-mail</label>
            <input
              className="wa-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
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
            style={{ width:'100%', justifyContent:'center', marginTop:'1.25rem', padding:'.75rem', fontSize:'14px' }}
            type="submit" disabled={loading}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── DashboardScreen ──────────────────────────────────────── */
function DashboardScreen({ user, branding }) {
  const { ceremonies } = useCeremonies(user);
  const [statsMap, setStatsMap] = useState({});

  useEffect(() => {
    if (ceremonies.length === 0) return;
    Promise.all(
      ceremonies.map(c => WA.guests.stats(c.id).then(s => [c.id, { ...s, ceremony: c }]))
    ).then(entries => setStatsMap(Object.fromEntries(entries))).catch(() => {});
  }, [ceremonies.length]);

  const allStats = Object.values(statsMap);
  const totals = allStats.reduce(
    (acc, s) => ({
      total: acc.total + (s.total || 0),
      arrived: acc.arrived + (s.arrived || 0),
      notArrived: acc.notArrived + (s.notArrived || 0),
      totalSeats: acc.totalSeats + (s.totalSeats || 0),
    }),
    { total: 0, arrived: 0, notArrived: 0, totalSeats: 0 }
  );

  return (
    <div>
      {/* Global totals */}
      <div className="wa-stat-grid wa-mb-lg">
        <StatCard value={totals.total}      label="Total invités" />
        <StatCard value={totals.totalSeats} label="Places totales" />
        <StatCard value={totals.arrived}    label="Arrivés" color="var(--wa-success)" />
        <StatCard value={totals.notArrived} label="Non arrivés" color="var(--wa-muted)" />
      </div>

      {/* Per-ceremony breakdown (SUPER_ADMIN) */}
      {user.role === 'SUPER_ADMIN' && ceremonies.length > 1 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          {ceremonies.map(c => {
            const s = statsMap[c.id];
            return (
              <div key={c.id} className="wa-card">
                <div className="wa-ceremony-header">
                  <span className="wa-badge wa-badge-gold">{cereomonyLabel(c.type)}</span>
                  <h3>{c.name}</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.5rem', marginTop:'.75rem' }}>
                  <StatCard value={s?.total}      label="Invités"     small />
                  <StatCard value={s?.arrived}    label="Arrivés"     small color="var(--wa-success)" />
                  <StatCard value={s?.totalSeats} label="Places"      small />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="wa-card">
        {branding?.monogramPath && (
          <div className="wa-monogram-hero">
            <img
              src={WA.fileUrl(branding.monogramPath, 'branding')}
              alt=""
              className="wa-monogram-hero-img"
            />
          </div>
        )}
        <div className="wa-card-title">Bienvenue, {user.firstName}</div>
        <p style={{ color:'var(--wa-muted)', fontSize:'13px', marginTop:'.25rem' }}>
          Utilisez le menu pour gérer les invités, scanner les QR codes et générer les invitations.
        </p>
        <FloralDivider />
        <div className="wa-info-box" style={{ marginTop:'.5rem' }}>
          Rappel : générez d'abord les QR codes, puis les invitations PDF depuis l'écran "Invitations PDF".
        </div>
      </div>
    </div>
  );
}

/* ─── GuestsScreen ──────────────────────────────────────────── */
function GuestsScreen({ user }) {
  const { ceremonies } = useCeremonies(user);
  const [ceremonyId, setCeremonyId] = useState('');
  const [guests, setGuests]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [stats, setStats]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const debounceRef = useRef(null);

  const canDelete = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_VIN_HONNEUR';

  useEffect(() => {
    if (ceremonies.length > 0 && !ceremonyId) setCeremonyId(ceremonies[0].id);
  }, [ceremonies.length]);

  const load = useCallback((q = search) => {
    if (!ceremonyId) return;
    setLoading(true);
    Promise.all([
      WA.guests.list(ceremonyId, q),
      WA.guests.stats(ceremonyId),
    ])
      .then(([gs, st]) => { setGuests(gs); setStats(st); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ceremonyId, search]);

  useEffect(() => { load(''); setSearch(''); }, [ceremonyId]);

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  };

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await WA.guests.delete(confirmDelete.id);
      setGuests(prev => prev.filter(g => g.id !== confirmDelete.id));
      setConfirmDelete(null);
      WA.guests.stats(ceremonyId).then(setStats).catch(() => {});
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const statusBadge = (s) => {
    if (s === 'ARRIVED') return <span className="wa-badge wa-badge-success">Arrivé</span>;
    return <span className="wa-badge wa-badge-muted">Non arrivé</span>;
  };

  const typeBadge = (t) =>
    t === 'COUPLE'
      ? <span className="wa-badge wa-badge-gold">Couple</span>
      : <span className="wa-badge wa-badge-muted">Individuel</span>;

  const isLocked = user.role !== 'SUPER_ADMIN';

  return (
    <div>
      {/* Header: ceremony selector + stats */}
      <div className="wa-flex-between wa-mb" style={{ flexWrap:'wrap', gap:'.75rem' }}>
        <div className="wa-flex wa-gap-sm" style={{ flexWrap:'wrap' }}>
          <CeremonySelector ceremonies={ceremonies} value={ceremonyId} onChange={setCeremonyId} locked={isLocked} />
          {stats && (
            <>
              <span className="wa-badge wa-badge-muted">{stats.total} invités</span>
              <span className="wa-badge wa-badge-gold">{stats.totalSeats} places</span>
              <span className="wa-badge wa-badge-success">{stats.arrived} arrivés</span>
            </>
          )}
        </div>
        <div className="wa-flex wa-gap-sm">
          <input
            className="wa-input" style={{ maxWidth:'220px' }}
            placeholder="Rechercher…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <button className="wa-btn wa-btn-primary" onClick={() => setShowAdd(true)}>+ Ajouter</button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          guest={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}

      {showAdd && (
        <AddGuestForm
          ceremonyId={ceremonyId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(''); setSearch(''); }}
        />
      )}

      {/* Desktop table */}
      <div className="wa-card wa-table-mobile-hide" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Invité</th>
                <th>Type</th>
                <th>Table</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Chargement…</td></tr>}
              {!loading && guests.length === 0 && <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Aucun invité trouvé</td></tr>}
              {guests.map(g => (
                <tr key={g.id}>
                  <td style={{ fontWeight:500 }}>
                    {g.primaryName}
                    {g.companionName && <span style={{ color:'var(--wa-muted)', fontWeight:400 }}> & {g.companionName}</span>}
                    {g.phone && <div style={{ fontSize:'11px', color:'var(--wa-muted)' }}>{g.phone}</div>}
                  </td>
                  <td>{typeBadge(g.type)}</td>
                  <td>{g.table?.name || <span className="wa-text-muted">—</span>}</td>
                  <td>{statusBadge(g.entryStatus)}</td>
                  <td>
                    <div className="wa-flex wa-gap-xs">
                      <button
                        className="wa-btn wa-btn-ghost"
                        style={{ fontSize:'11px', padding:'.2rem .45rem' }}
                        title="Générer QR"
                        onClick={() => WA.qr.generate(g.id).then(() => load()).catch(e => alert(e.message))}
                      >QR</button>
                      <button
                        className="wa-btn wa-btn-ghost"
                        style={{ fontSize:'11px', padding:'.2rem .45rem' }}
                        title="Générer & télécharger PDF"
                        onClick={() => WA.invitations.generateAndDownload(g.id).catch(e => alert(e.message))}
                      >PDF</button>
                      {g.phone && (
                        <a
                          href={`https://wa.me/${g.phone.replace(/\D/g,'')}?text=${encodeURIComponent('Bonjour ' + g.primaryName + ', votre invitation est prête. Merci de contacter l\'organisateur pour la recevoir.')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="wa-btn wa-btn-ghost"
                          style={{ fontSize:'11px', padding:'.2rem .45rem', color:'#25D366' }}
                          title="WhatsApp"
                        >WA</a>
                      )}
                      {canDelete && (
                        <button
                          className="wa-btn wa-btn-ghost"
                          style={{ fontSize:'11px', padding:'.2rem .45rem', color:'var(--wa-error)' }}
                          title="Supprimer"
                          onClick={() => setConfirmDelete(g)}
                        >✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="wa-mobile-cards">
        {loading && <p style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Chargement…</p>}
        {!loading && guests.length === 0 && <p style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Aucun invité trouvé</p>}
        {guests.map(g => (
          <div key={g.id} className="wa-guest-card">
            <div className="wa-flex-between" style={{ marginBottom:'.375rem' }}>
              <div>
                <span style={{ fontWeight:600 }}>{g.primaryName}</span>
                {g.companionName && <span style={{ color:'var(--wa-muted)' }}> & {g.companionName}</span>}
              </div>
              {statusBadge(g.entryStatus)}
            </div>
            <div className="wa-flex wa-gap-sm" style={{ marginBottom:'.5rem' }}>
              {typeBadge(g.type)}
              {g.table && <span className="wa-badge wa-badge-info">Table {g.table.name}</span>}
            </div>
            <div className="wa-flex wa-gap-xs" style={{ flexWrap:'wrap' }}>
              <button className="wa-btn wa-btn-secondary" style={{ fontSize:'12px', padding:'.3rem .6rem' }}
                onClick={() => WA.qr.generate(g.id).then(() => load()).catch(e => alert(e.message))}>QR</button>
              <button className="wa-btn wa-btn-primary" style={{ fontSize:'12px', padding:'.3rem .6rem' }}
                onClick={() => WA.invitations.generateAndDownload(g.id).catch(e => alert(e.message))}>PDF</button>
              {g.phone && (
                <a href={`https://wa.me/${g.phone.replace(/\D/g,'')}?text=${encodeURIComponent('Bonjour ' + g.primaryName + ', votre invitation est prête.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="wa-btn wa-btn-whatsapp" style={{ fontSize:'12px', padding:'.3rem .6rem' }}>
                  WhatsApp
                </a>
              )}
              {canDelete && (
                <button
                  className="wa-btn wa-btn-ghost"
                  style={{ fontSize:'12px', padding:'.3rem .6rem', color:'var(--wa-error)' }}
                  onClick={() => setConfirmDelete(g)}
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
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
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="wa-card wa-mb" style={{ maxWidth:'520px' }}>
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
              <label className="wa-form-label">Nom de l'accompagnant *</label>
              <input className="wa-input" value={form.companionName} onChange={e => set('companionName', e.target.value)} required={form.type === 'COUPLE'} placeholder="Prénom Nom" />
            </div>
          )}
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">E-mail</label>
            <input className="wa-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Téléphone (WhatsApp)</label>
            <input className="wa-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 6 00 00 00 00" />
          </div>
        </div>
        {err && <div className="wa-form-error" style={{ marginTop:'.5rem' }}>{err}</div>}
        <div className="wa-flex wa-gap-sm" style={{ marginTop:'1rem' }}>
          <button className="wa-btn wa-btn-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</button>
          <button className="wa-btn wa-btn-ghost" type="button" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

/* ─── InvitationsScreen ─────────────────────────────────────── */
function InvitationsScreen({ user }) {
  const { ceremonies } = useCeremonies(user);
  const [ceremonyId, setCeremonyId] = useState('');
  const [guests, setGuests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult]   = useState(null);
  const [generating, setGenerating]   = useState({});

  useEffect(() => {
    if (ceremonies.length > 0 && !ceremonyId) setCeremonyId(ceremonies[0].id);
  }, [ceremonies.length]);

  useEffect(() => {
    if (!ceremonyId) return;
    setLoading(true);
    WA.guests.list(ceremonyId, '').then(setGuests).catch(() => {}).finally(() => setLoading(false));
  }, [ceremonyId]);

  async function generateAll() {
    if (!ceremonyId) return;
    if (!confirm('Générer les invitations pour tous les invités de cette cérémonie ?')) return;
    setBulkLoading(true); setBulkResult(null);
    try {
      const res = await WA.invitations.bulk(ceremonyId);
      setBulkResult(res);
    } catch (e) { alert(e.message); }
    finally { setBulkLoading(false); }
  }

  async function generateOne(guest) {
    setGenerating(g => ({ ...g, [guest.id]: true }));
    try {
      await WA.invitations.generateAndDownload(guest.id);
    } catch (e) { alert(e.message); }
    finally { setGenerating(g => ({ ...g, [guest.id]: false })); }
  }

  const isLocked = user.role !== 'SUPER_ADMIN';

  return (
    <div>
      {/* Header */}
      <div className="wa-flex-between wa-mb" style={{ flexWrap:'wrap', gap:'.75rem' }}>
        <CeremonySelector ceremonies={ceremonies} value={ceremonyId} onChange={setCeremonyId} locked={isLocked} />
        <div className="wa-flex wa-gap-sm">
          {bulkResult && (
            <span className="wa-badge wa-badge-success">
              ✓ {bulkResult.succeeded}/{bulkResult.total} générées
            </span>
          )}
          <button className="wa-btn wa-btn-primary" onClick={generateAll} disabled={bulkLoading || !ceremonyId}>
            {bulkLoading ? 'Génération en cours…' : '⬇ Générer toutes'}
          </button>
        </div>
      </div>

      <div className="wa-info-box wa-mb">
        Cliquez sur <strong>Générer toutes</strong> pour créer les PDFs de tous les invités en une seule opération.
        Ou générez individuellement avec le bouton PDF sur chaque ligne.
        Le QR code est créé automatiquement si absent.
      </div>

      {/* Guest list with invitation actions */}
      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Invité</th>
                <th>Type</th>
                <th>Table</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Chargement…</td></tr>}
              {!loading && guests.length === 0 && <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--wa-muted)', padding:'2rem' }}>Aucun invité</td></tr>}
              {guests.map(g => (
                <tr key={g.id}>
                  <td style={{ fontWeight:500 }}>
                    {g.primaryName}
                    {g.companionName && <span style={{ color:'var(--wa-muted)', fontWeight:400 }}> & {g.companionName}</span>}
                  </td>
                  <td>
                    {g.type === 'COUPLE'
                      ? <span className="wa-badge wa-badge-gold">Couple · 2 places</span>
                      : <span className="wa-badge wa-badge-muted">Individuel · 1 place</span>}
                  </td>
                  <td>{g.table?.name || <span className="wa-text-muted">—</span>}</td>
                  <td style={{ fontSize:'12px', color:'var(--wa-muted)' }}>{g.phone || '—'}</td>
                  <td>
                    <div className="wa-flex wa-gap-xs">
                      <button
                        className="wa-btn wa-btn-primary"
                        style={{ fontSize:'12px', padding:'.25rem .6rem' }}
                        disabled={generating[g.id]}
                        onClick={() => generateOne(g)}
                      >
                        {generating[g.id] ? '…' : '⬇ PDF'}
                      </button>
                      {g.phone && (
                        <a
                          href={`https://wa.me/${g.phone.replace(/\D/g,'')}?text=${encodeURIComponent('Bonjour ' + g.primaryName + ', votre invitation pour le mariage est prête. Merci de nous contacter.')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="wa-btn wa-btn-whatsapp"
                          style={{ fontSize:'12px', padding:'.25rem .6rem' }}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
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

/* ─── TemplatesScreen ───────────────────────────────────────── */
function TemplatesScreen({ user }) {
  const { ceremonies } = useCeremonies(user);
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState({});
  const [uploading, setUploading] = useState({});
  const [qrZone, setQrZone]       = useState({});
  const [savingZone, setSavingZone] = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    ceremonies.forEach(c => loadTemplate(c.id));
  }, [ceremonies.length]);

  async function loadTemplate(cId) {
    try {
      const t = await WA.templates.getActive(cId);
      setTemplates(prev => ({ ...prev, [cId]: t }));
      if (t?.qrZoneConfig) {
        setQrZone(prev => ({ ...prev, [cId]: t.qrZoneConfig }));
      }
    } catch {
      setTemplates(prev => ({ ...prev, [cId]: null }));
    }
  }

  async function handleUpload(cId, file) {
    if (!file) return;
    setUploading(u => ({ ...u, [cId]: true }));
    try {
      await WA.templates.upload(cId, file, file.name.replace(/\.[^.]+$/, ''));
      await loadTemplate(cId);
    } catch (e) { alert(e.message); }
    finally { setUploading(u => ({ ...u, [cId]: false })); }
  }

  async function handleDeactivate(cId) {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await WA.templates.deactivate(cId);
      setTemplates(prev => ({ ...prev, [cId]: null }));
    } catch (e) { alert(e.message); }
  }

  async function saveQrZone(cId) {
    const zone = qrZone[cId] || {};
    if (!zone.x && zone.x !== 0) return alert('Renseignez les coordonnées QR');
    setSavingZone(s => ({ ...s, [cId]: true }));
    try {
      await WA.templates.setQrZone(cId, {
        x: Number(zone.x), y: Number(zone.y),
        width: Number(zone.width), height: Number(zone.height),
      });
      alert('Zone QR enregistrée ✓');
    } catch (e) { alert(e.message); }
    finally { setSavingZone(s => ({ ...s, [cId]: false })); }
  }

  const setZoneField = (cId, field, val) =>
    setQrZone(prev => ({ ...prev, [cId]: { ...(prev[cId] || {}), [field]: val } }));

  if (ceremonies.length === 0) return <div className="wa-card" style={{ color:'var(--wa-muted)' }}>Chargement…</div>;

  const current = ceremonies[activeTab] || ceremonies[0];
  const template = templates[current?.id];
  const zone = qrZone[current?.id] || {};

  return (
    <div>
      {/* Ceremony tabs */}
      <div className="wa-tabs">
        {ceremonies.map((c, i) => (
          <button key={c.id} className={`wa-tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
            {cereomonyLabel(c.type)}
          </button>
        ))}
      </div>

      {current && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
          {/* Upload section */}
          <div className="wa-card">
            <div className="wa-card-title">Template PDF</div>

            {template ? (
              <div style={{ marginTop:'1rem' }}>
                <div className="wa-badge wa-badge-success" style={{ marginBottom:'.75rem' }}>Template actif</div>
                <p style={{ fontSize:'13px', color:'var(--wa-charcoal)', marginBottom:'.25rem' }}>
                  <strong>{template.name || 'Template'}</strong>
                </p>
                <p style={{ fontSize:'12px', color:'var(--wa-muted)', marginBottom:'1rem' }}>
                  Uploadé le {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <div className="wa-flex wa-gap-sm">
                  <label className="wa-btn wa-btn-secondary" style={{ cursor:'pointer' }}>
                    Remplacer
                    <input type="file" accept=".pdf,.PDF" style={{ display:'none' }}
                      onChange={e => handleUpload(current.id, e.target.files[0])} />
                  </label>
                  <button className="wa-btn wa-btn-ghost" style={{ color:'var(--wa-error)' }}
                    onClick={() => handleDeactivate(current.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop:'1rem' }}>
                <label className="wa-upload-zone" style={{ display:'block' }}>
                  <div style={{ fontSize:'2rem', marginBottom:'.5rem', color:'var(--wa-gold)' }}>⬆</div>
                  <div style={{ fontWeight:500, color:'var(--wa-charcoal)', marginBottom:'.25rem' }}>
                    Importer le template {cereomonyLabel(current.type)}
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--wa-muted)' }}>Fichier PDF uniquement</div>
                  <input type="file" accept=".pdf,.PDF" onChange={e => handleUpload(current.id, e.target.files[0])} />
                </label>
                {uploading[current.id] && <p style={{ textAlign:'center', color:'var(--wa-muted)', marginTop:'.75rem', fontSize:'13px' }}>Upload en cours…</p>}
              </div>
            )}
          </div>

          {/* QR Zone configuration */}
          <div className="wa-card">
            <div className="wa-card-title">Zone QR Code</div>
            <p style={{ fontSize:'12px', color:'var(--wa-muted)', marginTop:'.25rem', marginBottom:'1rem' }}>
              Définissez la position (en points PDF) où le QR code sera incrusté dans le template.
              Coordonnées depuis le coin bas-gauche.
            </p>

            <div className="wa-qr-zone-grid">
              <div className="wa-form-group" style={{ margin:0 }}>
                <label className="wa-form-label">X (gauche)</label>
                <input className="wa-input" type="number" value={zone.x ?? ''} onChange={e => setZoneField(current.id, 'x', e.target.value)} placeholder="ex: 50" />
              </div>
              <div className="wa-form-group" style={{ margin:0 }}>
                <label className="wa-form-label">Y (bas)</label>
                <input className="wa-input" type="number" value={zone.y ?? ''} onChange={e => setZoneField(current.id, 'y', e.target.value)} placeholder="ex: 80" />
              </div>
              <div className="wa-form-group" style={{ margin:0 }}>
                <label className="wa-form-label">Largeur</label>
                <input className="wa-input" type="number" value={zone.width ?? ''} onChange={e => setZoneField(current.id, 'width', e.target.value)} placeholder="ex: 120" />
              </div>
              <div className="wa-form-group" style={{ margin:0 }}>
                <label className="wa-form-label">Hauteur</label>
                <input className="wa-input" type="number" value={zone.height ?? ''} onChange={e => setZoneField(current.id, 'height', e.target.value)} placeholder="ex: 120" />
              </div>
            </div>

            <button
              className="wa-btn wa-btn-primary"
              style={{ marginTop:'1rem', width:'100%', justifyContent:'center' }}
              onClick={() => saveQrZone(current.id)}
              disabled={savingZone[current.id] || !template}
            >
              {savingZone[current.id] ? 'Enregistrement…' : 'Enregistrer la zone QR'}
            </button>
            {!template && <p style={{ fontSize:'11px', color:'var(--wa-muted)', marginTop:'.5rem' }}>Uploadez d'abord un template.</p>}

            <div className="wa-info-box" style={{ marginTop:'1rem' }}>
              <strong>Astuce :</strong> ouvrez votre template dans Acrobat Reader, notez les coordonnées de l'espace "QR Code" indiqué sur le design, et saisissez-les ici.
              Un QR code standard fait 100–130 points de côté.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── BrandingScreen ────────────────────────────────────────── */
function BrandingScreen({ user, branding, onUpdate }) {
  const [appName, setAppName]   = useState(branding?.appName || '');
  const [saving, setSaving]     = useState(false);
  const [uploadingM, setUploadingM] = useState(false);
  const [uploadingL, setUploadingL] = useState(false);
  const [localBranding, setLocalBranding] = useState(branding);

  useEffect(() => { setLocalBranding(branding); setAppName(branding?.appName || ''); }, [branding]);

  const refresh = () => {
    WA.branding.get().then(b => { setLocalBranding(b); if (onUpdate) onUpdate(); }).catch(() => {});
  };

  async function saveName(e) {
    e.preventDefault();
    setSaving(true);
    try { await WA.branding.update({ appName }); refresh(); } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function uploadMonogram(file) {
    if (!file) return;
    setUploadingM(true);
    try { await WA.branding.uploadMonogram(file); refresh(); } catch (e) { alert(e.message); }
    finally { setUploadingM(false); }
  }

  async function deleteMonogram() {
    if (!confirm('Supprimer le monogramme ?')) return;
    try { await WA.branding.deleteMonogram(); refresh(); } catch (e) { alert(e.message); }
  }

  async function uploadLogo(file) {
    if (!file) return;
    setUploadingL(true);
    try { await WA.branding.uploadLogo(file); refresh(); } catch (e) { alert(e.message); }
    finally { setUploadingL(false); }
  }

  async function deleteLogo() {
    if (!confirm('Supprimer le logo ?')) return;
    try { await WA.branding.deleteLogo(); refresh(); } catch (e) { alert(e.message); }
  }

  const monogramUrl = localBranding?.monogramPath ? WA.fileUrl(localBranding.monogramPath, 'branding') : null;
  const logoUrl     = localBranding?.primaryLogoPath ? WA.fileUrl(localBranding.primaryLogoPath, 'branding') : null;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

      {/* App name */}
      <div className="wa-card" style={{ gridColumn:'1/-1' }}>
        <div className="wa-card-title">Nom de l'application</div>
        <form onSubmit={saveName} style={{ display:'flex', gap:'.75rem', marginTop:'1rem', maxWidth:'480px' }}>
          <input className="wa-input" value={appName} onChange={e => setAppName(e.target.value)} placeholder="Wedding Access" />
          <button className="wa-btn wa-btn-primary" type="submit" disabled={saving} style={{ flexShrink:0 }}>
            {saving ? '…' : 'Sauvegarder'}
          </button>
        </form>
      </div>

      {/* Monogram */}
      <div className="wa-card">
        <div className="wa-card-title">Monogramme du couple</div>
        <p style={{ fontSize:'12px', color:'var(--wa-muted)', marginTop:'.25rem', marginBottom:'1rem' }}>
          Apparaît dans la sidebar, l'écran de connexion et les exports PDF. Recommandé : PNG fond transparent, format carré.
        </p>

        <div style={{ textAlign:'center', marginBottom:'1rem' }}>
          {monogramUrl ? (
            <div className="wa-monogram-preview" style={{ width:'140px', height:'140px', margin:'0 auto' }}>
              <img src={monogramUrl} alt="Monogramme" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
          ) : (
            <div style={{ display:'flex', justifyContent:'center' }}>
              <WeddingMonogram size={100} />
            </div>
          )}
        </div>

        <div className="wa-flex wa-gap-sm" style={{ justifyContent:'center' }}>
          <label className="wa-btn wa-btn-primary" style={{ cursor:'pointer' }}>
            {uploadingM ? 'Upload…' : (monogramUrl ? 'Remplacer' : 'Uploader')}
            <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display:'none' }}
              onChange={e => uploadMonogram(e.target.files[0])} />
          </label>
          {monogramUrl && (
            <button className="wa-btn wa-btn-ghost" style={{ color:'var(--wa-error)' }} onClick={deleteMonogram}>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="wa-card">
        <div className="wa-card-title">Logo principal</div>
        <p style={{ fontSize:'12px', color:'var(--wa-muted)', marginTop:'.25rem', marginBottom:'1rem' }}>
          Logo alternatif pour les exports et documents officiels.
          Formats acceptés : PNG, JPG, SVG.
        </p>

        <div style={{ textAlign:'center', marginBottom:'1rem' }}>
          {logoUrl ? (
            <div style={{ maxWidth:'160px', margin:'0 auto', padding:'1rem', background:'var(--wa-stone)', borderRadius:'var(--wa-radius-lg)' }}>
              <img src={logoUrl} alt="Logo" style={{ maxWidth:'100%', maxHeight:'100px', objectFit:'contain' }} />
            </div>
          ) : (
            <div className="wa-template-preview" style={{ minHeight:'120px' }}>
              <span style={{ fontSize:'2rem', color:'var(--wa-muted)' }}>🖼</span>
              <span style={{ fontSize:'12px', color:'var(--wa-muted)' }}>Aucun logo uploadé</span>
            </div>
          )}
        </div>

        <div className="wa-flex wa-gap-sm" style={{ justifyContent:'center' }}>
          <label className="wa-btn wa-btn-primary" style={{ cursor:'pointer' }}>
            {uploadingL ? 'Upload…' : (logoUrl ? 'Remplacer' : 'Uploader')}
            <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display:'none' }}
              onChange={e => uploadLogo(e.target.files[0])} />
          </label>
          {logoUrl && (
            <button className="wa-btn wa-btn-ghost" style={{ color:'var(--wa-error)' }} onClick={deleteLogo}>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="wa-card" style={{ gridColumn:'1/-1' }}>
        <div className="wa-card-title">Aperçu</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginTop:'1rem' }}>
          {/* Day preview */}
          <div style={{ background:'#FAF8F4', border:'1px solid #E8E4DC', borderRadius:'var(--wa-radius-lg)', padding:'1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'.08em', color:'#9B9490', marginBottom:'.75rem' }}>Mode Jour</div>
            {monogramUrl
              ? <img src={monogramUrl} alt="Monogramme" style={{ width:'60px', height:'60px', objectFit:'contain', marginBottom:'.5rem' }} />
              : <WeddingMonogram size={60} />}
            <div style={{ fontFamily:'Playfair Display, Georgia, serif', fontSize:'1rem', color:'#C9A84C', marginTop:'.5rem' }}>{appName || 'Wedding Access'}</div>
            <div style={{ fontSize:'11px', color:'#9B9490', marginTop:'2px', fontStyle:'italic', fontFamily:'Cormorant Garamond, Georgia, serif' }}>4 Juillet 2026</div>
          </div>
          {/* Night preview */}
          <div style={{ background:'#0D1B34', border:'1px solid rgba(212,175,55,.2)', borderRadius:'var(--wa-radius-lg)', padding:'1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'.08em', color:'#6A85A8', marginBottom:'.75rem' }}>Mode Soir</div>
            {monogramUrl
              ? <img src={monogramUrl} alt="Monogramme" style={{ width:'60px', height:'60px', objectFit:'contain', marginBottom:'.5rem', filter:'drop-shadow(0 0 8px rgba(212,175,55,.4))' }} />
              : <svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#D4AF37" strokeWidth=".8" strokeDasharray="2,4" /><text x="50" y="57" textAnchor="middle" fontFamily="Cormorant Garamond" fontSize="22" fill="#D4AF37">M &amp; J</text></svg>}
            <div style={{ fontFamily:'Playfair Display, Georgia, serif', fontSize:'1rem', color:'#D4AF37', marginTop:'.5rem', textShadow:'0 0 12px rgba(212,175,55,.3)' }}>{appName || 'Wedding Access'}</div>
            <div style={{ fontSize:'11px', color:'#6A85A8', marginTop:'2px', fontStyle:'italic', fontFamily:'Cormorant Garamond, Georgia, serif' }}>4 Juillet 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SeatingScreen ─────────────────────────────────────────── */
function SeatingScreen({ user }) {
  const { ceremonies } = useCeremonies(user);
  const [ceremonyId, setCeremonyId] = useState('');
  const [tables, setTables]         = useState([]);
  const [guests, setGuests]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableChairs, setNewTableChairs] = useState(10);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (ceremonies.length > 0 && !ceremonyId) setCeremonyId(ceremonies[0].id);
  }, [ceremonies.length]);

  const load = useCallback(() => {
    if (!ceremonyId) return;
    setLoading(true);
    Promise.all([WA.tables.list(ceremonyId), WA.guests.list(ceremonyId, '')])
      .then(([t, g]) => { setTables(t); setGuests(g); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ceremonyId]);

  useEffect(() => { load(); }, [load]);

  async function createTable(e) {
    e.preventDefault();
    if (!newTableName.trim()) return;
    setSaving(true);
    try {
      await WA.tables.create({ name: newTableName.trim(), ceremonyId, numberOfChairs: Number(newTableChairs) });
      setNewTableName(''); setNewTableChairs(10); setShowAdd(false); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function deleteTable(id) {
    if (!confirm('Supprimer cette table ?')) return;
    try { await WA.tables.delete(id); load(); }
    catch (err) { alert(err.message); }
  }

  async function assignGuest(guestId, tableId) {
    try { await WA.tables.assign(guestId, tableId || null); load(); }
    catch (err) { alert(err.message); }
  }

  const unassigned = guests.filter(g => !g.tableId);
  const isLocked = user.role !== 'SUPER_ADMIN';

  return (
    <div>
      <div className="wa-flex-between wa-mb" style={{ flexWrap:'wrap', gap:'.75rem' }}>
        <div className="wa-flex wa-gap-sm">
          <CeremonySelector ceremonies={ceremonies} value={ceremonyId} onChange={id => { setCeremonyId(id); }} locked={isLocked} />
          <span style={{ fontSize:'13px', color:'var(--wa-muted)' }}>
            {tables.length} table{tables.length !== 1 ? 's' : ''} · {guests.length} invité{guests.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="wa-btn wa-btn-primary" onClick={() => setShowAdd(true)}>+ Nouvelle table</button>
      </div>

      {showAdd && (
        <form onSubmit={createTable} className="wa-card wa-mb" style={{ maxWidth:'400px' }}>
          <div className="wa-card-title">Nouvelle table</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'.75rem', marginTop:'.75rem' }}>
            <div className="wa-form-group" style={{ margin:0 }}>
              <label className="wa-form-label">Nom</label>
              <input className="wa-input" placeholder="Table des mariés" value={newTableName}
                onChange={e => setNewTableName(e.target.value)} autoFocus required />
            </div>
            <div className="wa-form-group" style={{ margin:0 }}>
              <label className="wa-form-label">Chaises</label>
              <input className="wa-input" type="number" min="1" max="30" value={newTableChairs}
                onChange={e => setNewTableChairs(e.target.value)} />
            </div>
          </div>
          <div className="wa-flex wa-gap-sm" style={{ marginTop:'.75rem' }}>
            <button className="wa-btn wa-btn-primary" type="submit" disabled={saving}>{saving ? '…' : 'Créer'}</button>
            <button className="wa-btn wa-btn-ghost" type="button" onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="wa-card" style={{ color:'var(--wa-muted)' }}>Chargement…</div>
      ) : (
        <>
          {unassigned.length > 0 && (
            <div className="wa-card wa-mb">
              <div className="wa-card-title" style={{ marginBottom:'.5rem' }}>
                Non placés ({unassigned.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem' }}>
                {unassigned.map(g => (
                  <select key={g.id} className="wa-input"
                    style={{ fontSize:'12px', padding:'.25rem .5rem', width:'auto', maxWidth:'200px' }}
                    defaultValue=""
                    onChange={e => { if (e.target.value) assignGuest(g.id, e.target.value); }}>
                    <option value="" disabled>
                      {g.primaryName}{g.companionName ? ` & ${g.companionName}` : ''}
                    </option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem' }}>
            {tables.map(t => {
              const seated = guests.filter(g => g.tableId === t.id);
              const full = seated.reduce((n, g) => n + g.numberOfSeats, 0) >= t.numberOfChairs;
              return (
                <div key={t.id} className="wa-card">
                  <div className="wa-flex-between" style={{ marginBottom:'.5rem' }}>
                    <span style={{ fontWeight:600, color:'var(--wa-gold)', fontFamily:'var(--wa-font-display)' }}>{t.name}</span>
                    <div className="wa-flex wa-gap-xs">
                      {full && <span className="wa-badge wa-badge-warning" style={{ fontSize:'10px' }}>Complet</span>}
                      <button className="wa-btn wa-btn-ghost" style={{ fontSize:'11px', padding:'.15rem .35rem', color:'var(--wa-error)' }}
                        onClick={() => deleteTable(t.id)}>✕</button>
                    </div>
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--wa-muted)', marginBottom:'.5rem' }}>
                    {seated.reduce((n, g) => n + g.numberOfSeats, 0)} / {t.numberOfChairs} places
                  </div>
                  {seated.length === 0
                    ? <p style={{ fontSize:'12px', color:'var(--wa-muted)', fontStyle:'italic' }}>Aucun invité</p>
                    : seated.map(g => (
                      <div key={g.id} className="wa-flex-between" style={{ fontSize:'13px', padding:'.25rem 0', borderBottom:'1px solid var(--wa-stone)' }}>
                        <span>
                          {g.primaryName}
                          {g.companionName && <span style={{ color:'var(--wa-muted)', fontSize:'12px' }}> & {g.companionName}</span>}
                        </span>
                        <button className="wa-btn wa-btn-ghost" style={{ fontSize:'11px', padding:'.15rem .35rem' }}
                          onClick={() => assignGuest(g.id, null)}>✕</button>
                      </div>
                    ))
                  }
                </div>
              );
            })}
            {tables.length === 0 && (
              <div className="wa-card" style={{ color:'var(--wa-muted)', textAlign:'center', padding:'2rem', gridColumn:'1/-1' }}>
                Aucune table créée. Cliquez sur "+ Nouvelle table" pour commencer.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── HistoryScreen ─────────────────────────────────────────── */
function HistoryScreen({ user }) {
  const { ceremonies } = useCeremonies(user);
  const [ceremonyId, setCeremonyId] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [scans, setScans]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    WA.scan.history(ceremonyId, page)
      .then(r => { setScans(r.data || []); setTotal(r.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ceremonyId, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = resultFilter ? scans.filter(s => s.result === resultFilter) : scans;

  const resultBadge = (r) => {
    const map = {
      VALID:         ['success', 'Validé'],
      ALREADY_USED:  ['warning', 'Déjà utilisé'],
      WRONG_CEREMONY:['error',   'Mauvaise cérémonie'],
      INVALID:       ['error',   'Invalide'],
    };
    const [type, label] = map[r] || ['muted', r];
    return <span className={`wa-badge wa-badge-${type}`}>{label}</span>;
  };

  return (
    <div>
      {/* Filters */}
      <div className="wa-flex wa-gap-sm wa-mb" style={{ flexWrap:'wrap' }}>
        <CeremonySelector
          ceremonies={[{ id:'', type:'ALL', name:'Toutes' }, ...ceremonies]}
          value={ceremonyId}
          onChange={id => { setCeremonyId(id); setPage(1); }}
          locked={user.role !== 'SUPER_ADMIN' && ceremonies.length <= 1}
        />
        <select className="wa-input" style={{ maxWidth:'180px' }} value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
          <option value="">Tous les résultats</option>
          <option value="VALID">Validé</option>
          <option value="ALREADY_USED">Déjà utilisé</option>
          <option value="WRONG_CEREMONY">Mauvaise cérémonie</option>
          <option value="INVALID">Invalide</option>
        </select>
        {total > 0 && <span className="wa-badge wa-badge-muted">{total} scans</span>}
      </div>

      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Invité</th>
                <th>Cérémonie</th>
                <th>Résultat</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Chargement…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Aucun scan</td></tr>}
              {filtered.map((s, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace:'nowrap', fontSize:'12px' }}>{new Date(s.scannedAt).toLocaleString('fr-FR')}</td>
                  <td>{s.guest?.primaryName || <span className="wa-text-muted">—</span>}</td>
                  <td>
                    {s.ceremony
                      ? <span className="wa-badge wa-badge-gold" style={{ fontSize:'10px' }}>{cereomonyLabel(s.ceremony.type)}</span>
                      : <span className="wa-text-muted">—</span>}
                  </td>
                  <td>{resultBadge(s.result)}</td>
                  <td style={{ fontSize:'12px' }}>{s.scannedBy?.firstName ? `${s.scannedBy.firstName} ${s.scannedBy.lastName}` : s.scannedBy?.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="wa-flex wa-gap-sm wa-mt" style={{ justifyContent:'center' }}>
          <button className="wa-btn wa-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
          <span style={{ fontSize:'13px', color:'var(--wa-muted)', padding:'.5rem' }}>Page {page}</span>
          <button className="wa-btn wa-btn-ghost" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

/* ─── UsersScreen ───────────────────────────────────────────── */
const ROLES = ['SUPER_ADMIN','ADMIN_VIN_HONNEUR','AGENT_VIN_HONNEUR','AGENT_DINER'];
const SCOPES = { SUPER_ADMIN: null, ADMIN_VIN_HONNEUR:'VIN_HONNEUR', AGENT_VIN_HONNEUR:'VIN_HONNEUR', AGENT_DINER:'DINER' };
const EMPTY_USER_FORM = { firstName:'', lastName:'', email:'', password:'', role:'AGENT_VIN_HONNEUR', isActive:true };

function UsersScreen({ user: currentUser }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editUser, setEditUser] = useState(null);

  const load = () => {
    setLoading(true);
    WA.users.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function saveUser(form) {
    const payload = {
      firstName: form.firstName, lastName: form.lastName,
      email: form.email, role: form.role,
      ceremonyScope: SCOPES[form.role] || null,
      isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;
    if (form.id) {
      await WA.users.update(form.id, payload);
    } else {
      if (!form.password) throw new Error('Le mot de passe est requis pour un nouvel utilisateur');
      await WA.users.create(payload);
    }
    setEditUser(null); load();
  }

  async function deleteUser(u) {
    if (!confirm(`Supprimer ${u.firstName} ${u.lastName} ?`)) return;
    try { await WA.users.delete(u.id); load(); } catch (err) { alert(err.message); }
  }

  const roleLabel = (r) => ({
    SUPER_ADMIN: 'Super Admin',
    ADMIN_VIN_HONNEUR: 'Admin Vin d\'honneur',
    AGENT_VIN_HONNEUR: 'Agent Vin d\'honneur',
    AGENT_DINER: 'Agent Dîner',
  }[r] || r);

  return (
    <div>
      <div className="wa-flex-between wa-mb">
        <span style={{ fontSize:'13px', color:'var(--wa-muted)' }}>{users.length} utilisateur{users.length !== 1 ? 's' : ''}</span>
        <button className="wa-btn wa-btn-primary" onClick={() => setEditUser(EMPTY_USER_FORM)}>+ Nouvel utilisateur</button>
      </div>

      {editUser !== null && (
        <UserForm initial={editUser} onSave={saveUser} onCancel={() => setEditUser(null)} roleLabel={roleLabel} />
      )}

      <div className="wa-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" style={{ textAlign:'center', padding:'2rem', color:'var(--wa-muted)' }}>Chargement…</td></tr>}
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight:500 }}>{u.firstName} {u.lastName}</td>
                  <td style={{ fontSize:'12px' }}>{u.email}</td>
                  <td><span className="wa-badge wa-badge-info">{roleLabel(u.role)}</span></td>
                  <td><span className={`wa-badge wa-badge-${u.isActive ? 'success' : 'muted'}`}>{u.isActive ? 'Actif' : 'Inactif'}</span></td>
                  <td>
                    <div className="wa-flex wa-gap-xs">
                      <button className="wa-btn wa-btn-ghost" style={{ fontSize:'12px', padding:'.2rem .45rem' }}
                        onClick={() => setEditUser({ ...u, password:'' })}>Éditer</button>
                      {u.id !== currentUser.id && (
                        <button className="wa-btn wa-btn-ghost" style={{ fontSize:'12px', padding:'.2rem .45rem', color:'var(--wa-error)' }}
                          onClick={() => deleteUser(u)}>Suppr.</button>
                      )}
                    </div>
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

function UserForm({ initial, onSave, onCancel, roleLabel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const isNew = !form.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const visibleRoles = ROLES;

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try { await onSave(form); } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="wa-card wa-mb" style={{ maxWidth:'560px' }}>
      <div className="wa-card-title">{isNew ? 'Nouvel utilisateur' : `Éditer — ${form.firstName} ${form.lastName}`}</div>
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
            <label className="wa-form-label">E-mail *</label>
            <input className="wa-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">{isNew ? 'Mot de passe *' : 'Nouveau mot de passe'}</label>
            <input className="wa-input" type="password" value={form.password} onChange={e => set('password', e.target.value)}
              required={isNew} placeholder={isNew ? '' : 'Laisser vide pour ne pas changer'} />
          </div>
          <div className="wa-form-group" style={{ margin:0 }}>
            <label className="wa-form-label">Rôle *</label>
            <select className="wa-input" value={form.role} onChange={e => set('role', e.target.value)}>
              {visibleRoles.map(r => <option key={r} value={r}>{roleLabel ? roleLabel(r) : r}</option>)}
            </select>
          </div>
          <div className="wa-form-group" style={{ margin:0, display:'flex', alignItems:'center', gap:'.5rem', paddingTop:'1.5rem' }}>
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
            <label htmlFor="isActive" className="wa-form-label" style={{ margin:0 }}>Compte actif</label>
          </div>
        </div>
        {err && <div className="wa-form-error" style={{ marginTop:'.5rem' }}>{err}</div>}
        <div className="wa-flex wa-gap-sm" style={{ marginTop:'1rem' }}>
          <button className="wa-btn wa-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : isNew ? 'Créer' : 'Sauvegarder'}
          </button>
          <button className="wa-btn wa-btn-ghost" type="button" onClick={onCancel}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
