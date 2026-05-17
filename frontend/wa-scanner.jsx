/* Wedding Access · Scanner QR */
const { useState, useEffect, useRef, useCallback } = React;

function ScannerScreen({ user, branding }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const detRef    = useRef(null);
  const rafRef    = useRef(null);
  const resetRef  = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual]     = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState('idle'); // idle | verified | done | rejected

  /* ── Ceremony for SUPER_ADMIN ── */
  const [ceremonies, setCeremonies] = useState([]);
  const [scanCeremonyId, setScanCeremonyId] = useState('');
  useEffect(() => {
    if (user.role === 'SUPER_ADMIN') {
      WA.ceremonies.list().then(cs => {
        setCeremonies(cs);
        if (cs.length > 0) setScanCeremonyId(cs[0].id);
      }).catch(() => {});
    }
  }, []);

  /* ── Cleanup ── */
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => { stopCamera(); clearTimeout(resetRef.current); }, [stopCamera]);

  /* ── Camera ── */
  async function startCamera() {
    setResult(null); setStep('idle'); setManual('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      if ('BarcodeDetector' in window) {
        detRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        scheduleScan();
      }
    } catch {
      alert("Impossible d'accéder à la caméra. Utilisez la saisie manuelle.");
    }
  }

  function scheduleScan() {
    rafRef.current = requestAnimationFrame(async () => {
      if (!videoRef.current || !detRef.current || !streamRef.current) return;
      try {
        const codes = await detRef.current.detect(videoRef.current);
        if (codes.length > 0) { stopCamera(); await handleToken(codes[0].rawValue); return; }
      } catch {}
      scheduleScan();
    });
  }

  /* ── Two-step flow ── */
  async function handleToken(token) {
    setLoading(true); setResult(null); setStep('idle');
    try {
      const data = await WA.scan.verify(token);
      setResult({ ...data, token });
      if (data.valid) {
        setStep('verified');
      } else {
        setStep('rejected');
        autoReset(data.result === 'ALREADY_USED' ? 8000 : 5000);
      }
    } catch (e) {
      setResult({ valid: false, result: 'INVALID', message: e.message });
      setStep('rejected');
      autoReset(5000);
    } finally {
      setLoading(false);
    }
  }

  async function confirmEntry() {
    if (!result?.token) return;
    setLoading(true);
    try {
      const data = await WA.scan.markEntry(result.token);
      setResult(r => ({ ...r, ...data, type:'success' }));
      setStep('done');
      autoReset(6000);
    } catch (e) {
      setResult(r => ({ ...r, result:'INVALID', message: e.message }));
      setStep('rejected');
      autoReset(5000);
    } finally {
      setLoading(false);
    }
  }

  function autoReset(delay) {
    clearTimeout(resetRef.current);
    resetRef.current = setTimeout(reset, delay);
  }

  function reset() {
    clearTimeout(resetRef.current);
    setResult(null); setStep('idle'); setManual('');
  }

  /* ── Ceremony label ── */
  const ceremonyLabel = user.ceremonyScope
    ? (user.ceremonyScope === 'VIN_HONNEUR' ? "Vin d'honneur" : 'Dîner')
    : (ceremonies.find(c => c.id === scanCeremonyId)?.name || 'Toutes cérémonies');

  /* ── Render ── */
  return (
    <div className="wa-scanner-page">
      <div style={{ width:'100%', textAlign:'center' }}>
        <h2 style={{ fontFamily:'var(--wa-font-display)', fontSize:'1.5rem', fontWeight:500, color:'var(--wa-gold)', marginBottom:'.25rem' }}>
          Contrôle d'accès
        </h2>
        <p style={{ fontSize:'12px', color:'var(--wa-muted)' }}>{ceremonyLabel}</p>
        {user.role === 'SUPER_ADMIN' && ceremonies.length > 0 && step === 'idle' && (
          <select className="wa-input" style={{ maxWidth:'200px', margin:'.5rem auto 0', display:'block' }}
            value={scanCeremonyId} onChange={e => setScanCeremonyId(e.target.value)}>
            {ceremonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Camera viewport */}
      <div className="wa-scanner-viewport" style={{ display: cameraOn ? 'block' : 'none' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        <div className="wa-scanner-overlay">
          <div className="wa-scanner-frame" />
        </div>
      </div>

      {/* Monogram idle branding */}
      {step === 'idle' && !cameraOn && branding?.monogramUrl && (
        <div className="wa-monogram-scanner">
          <img src={branding.monogramUrl} alt="" />
        </div>
      )}

      {/* Camera controls */}
      {!cameraOn && step === 'idle' && (
        <button className="wa-btn wa-btn-primary"
          style={{ width:'100%', padding:'1rem', justifyContent:'center', fontSize:'15px', letterSpacing:'.03em' }}
          onClick={startCamera}>
          ⬡ Activer la caméra
        </button>
      )}
      {cameraOn && (
        <button className="wa-btn wa-btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={stopCamera}>
          Arrêter la caméra
        </button>
      )}

      {/* Manual input */}
      {step === 'idle' && (
        <div style={{ width:'100%' }}>
          <label className="wa-form-label">Ou saisir le token manuellement</label>
          <div className="wa-flex wa-gap-sm" style={{ marginTop:'.375rem' }}>
            <input
              className="wa-input"
              placeholder="WA-xxxxxxxxxxxxx"
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manual.trim() && handleToken(manual.trim())}
            />
            <button
              className="wa-btn wa-btn-primary"
              disabled={!manual.trim() || loading}
              onClick={() => handleToken(manual.trim())}
              style={{ flexShrink:0 }}
            >
              Vérifier
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ color:'var(--wa-muted)', fontSize:'13px', textAlign:'center' }}>Vérification…</div>
      )}

      {/* ── Result cards ── */}
      {result && !loading && (
        <>
          {/* VERIFIED — guest identified, awaiting confirmation */}
          {step === 'verified' && (
            <div className="wa-scanner-result info" style={{ width:'100%' }}>
              <div className="wa-scanner-icon" style={{ color:'var(--wa-gold)' }}>⬡</div>
              <h3>Invité identifié</h3>
              {result.guest && (
                <p style={{ margin:'.5rem 0' }}>
                  <strong style={{ fontSize:'1.1rem' }}>
                    {result.guest.primaryName}
                    {result.guest.companionName ? ` et ${result.guest.companionName}` : ''}
                  </strong>
                  {result.guest.table && <><br /><span className="wa-badge wa-badge-info" style={{ marginTop:'.35rem' }}>Table {result.guest.table.name}</span></>}
                </p>
              )}
              <div className="wa-flex wa-gap-sm" style={{ marginTop:'1rem', justifyContent:'center' }}>
                <button className="wa-btn wa-btn-primary" style={{ padding:'.75rem 1.5rem', fontSize:'14px' }} onClick={confirmEntry} disabled={loading}>
                  ✓ Valider l'entrée
                </button>
                <button className="wa-btn wa-btn-ghost" onClick={reset}>Annuler</button>
              </div>
            </div>
          )}

          {/* DONE — entry confirmed */}
          {step === 'done' && (
            <div className="wa-scanner-result success" style={{ width:'100%' }}>
              <div className="wa-scanner-icon">✓</div>
              <h3>Entrée validée !</h3>
              {result.guest && (
                <p style={{ margin:'.5rem 0' }}>
                  <strong>
                    {result.guest.primaryName}
                    {result.guest.companionName ? ` et ${result.guest.companionName}` : ''}
                  </strong>
                  <br />Bienvenue !
                  {result.guest.table && <><br /><span style={{ fontWeight:600 }}>→ Table {result.guest.table.name}</span></>}
                </p>
              )}
              <button className="wa-btn wa-btn-ghost" style={{ marginTop:'1rem' }} onClick={reset}>
                Scanner suivant
              </button>
            </div>
          )}

          {/* REJECTED — already used, wrong ceremony, or invalid */}
          {step === 'rejected' && (
            <div className={`wa-scanner-result ${result.result === 'ALREADY_USED' ? 'warning' : 'error'}`} style={{ width:'100%' }}>
              <div className="wa-scanner-icon">
                {result.result === 'ALREADY_USED' ? '⚠' : '✕'}
              </div>
              <h3>
                {result.result === 'ALREADY_USED'   && 'Déjà enregistré'}
                {result.result === 'WRONG_CEREMONY' && 'Mauvaise cérémonie'}
                {result.result === 'INVALID'        && 'QR invalide'}
                {!['ALREADY_USED','WRONG_CEREMONY','INVALID'].includes(result.result) && 'Accès refusé'}
              </h3>
              {result.guest && result.result === 'ALREADY_USED' && (
                <p style={{ margin:'.35rem 0' }}>
                  <strong>
                    {result.guest.primaryName}
                    {result.guest.companionName ? ` et ${result.guest.companionName}` : ''}
                  </strong>
                  <br />Cet invité a déjà été enregistré.
                </p>
              )}
              {result.message && !result.guest && <p style={{ margin:'.35rem 0' }}>{result.message}</p>}
              <button className="wa-btn wa-btn-ghost" style={{ marginTop:'1rem' }} onClick={reset}>Réessayer</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
