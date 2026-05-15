/* Wedding Access · Scanner QR */
const { useState, useEffect, useRef, useCallback } = React;

function ScannerScreen({ user }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const detRef    = useRef(null);
  const rafRef    = useRef(null);

  const [cameraOn, setCameraOn]   = useState(false);
  const [manual, setManual]       = useState('');
  const [result, setResult]       = useState(null); // { type, guest, message, token }
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState('idle'); // idle | verified | done

  /* ─── Cleanup ──────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ─── Camera start ─────────────────────────────────── */
  async function startCamera() {
    setResult(null); setStep('idle');
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
      alert("Impossible d'accéder à la caméra. Veuillez utiliser la saisie manuelle.");
    }
  }

  function scheduleScan() {
    rafRef.current = requestAnimationFrame(async () => {
      if (!videoRef.current || !detRef.current || !streamRef.current) return;
      try {
        const codes = await detRef.current.detect(videoRef.current);
        if (codes.length > 0) {
          stopCamera();
          await handleToken(codes[0].rawValue);
          return;
        }
      } catch {}
      scheduleScan();
    });
  }

  /* ─── Two-step flow ────────────────────────────────── */
  async function handleToken(token) {
    setLoading(true); setResult(null); setStep('idle');
    try {
      const data = await WA.scan.verify(token);
      setResult({ type:'verify', ...data, token });
      setStep('verified');
    } catch (e) {
      setResult({ type:'error', message: e.message });
      setStep('idle');
    } finally {
      setLoading(false);
    }
  }

  async function confirmEntry() {
    if (!result?.token) return;
    setLoading(true);
    try {
      await WA.scan.markEntry(result.token);
      setResult(r => ({ ...r, type:'success', message:"Entrée enregistrée avec succès." }));
      setStep('done');
    } catch (e) {
      setResult(r => ({ ...r, type:'error', message: e.message }));
      setStep('idle');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null); setStep('idle'); setManual('');
  }

  /* ─── Render ───────────────────────────────────────── */
  return (
    <div className="wa-scanner-page">
      <div style={{ width:'100%', textAlign:'center' }}>
        <h2 style={{ fontFamily:'var(--wa-font-serif)', fontSize:'1.5rem', fontWeight:300, color:'var(--wa-gold)', marginBottom:'.25rem' }}>
          Scanner d'entrée
        </h2>
        <p style={{ fontSize:'12px', color:'var(--wa-muted)' }}>
          {user.ceremonyScope === 'VIN_HONNEUR' ? 'Vin d\'honneur' : 'Dîner'}
        </p>
      </div>

      {/* Camera viewport */}
      <div className="wa-scanner-viewport" style={{ display: cameraOn ? 'block' : 'none' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        <div className="wa-scanner-overlay">
          <div className="wa-scanner-frame" />
        </div>
      </div>

      {/* Camera controls */}
      {!cameraOn && step === 'idle' && (
        <button className="wa-btn wa-btn-primary" style={{ width:'100%', padding:'.875rem', justifyContent:'center', fontSize:'15px' }} onClick={startCamera}>
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
          <label className="wa-form-label">Ou saisir le code manuellement</label>
          <div className="wa-flex wa-gap-sm" style={{ marginTop:'.375rem' }}>
            <input
              className="wa-input"
              placeholder="WA-V-0001-2026.xxxxxxxx"
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

      {/* Loading */}
      {loading && (
        <div style={{ color:'var(--wa-muted)', fontSize:'13px' }}>Vérification en cours…</div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={`wa-scanner-result ${
          step === 'done' ? 'success' :
          result.type === 'error' ? 'error' :
          result.type === 'verify' ? 'warning' : 'success'
        }`} style={{ width:'100%' }}>
          {result.type === 'verify' && (
            <>
              <h3>Invité identifié</h3>
              {result.guest && (
                <p>
                  <strong>{result.guest.firstName} {result.guest.lastName}</strong><br />
                  {result.guest.tableNumber && `Table ${result.guest.tableNumber}`}<br />
                  Statut actuel : {result.guest.entryStatus}
                </p>
              )}
              <div className="wa-flex wa-gap-sm" style={{ marginTop:'.75rem' }}>
                <button className="wa-btn wa-btn-primary" onClick={confirmEntry} disabled={loading}>
                  ✓ Valider l'entrée
                </button>
                <button className="wa-btn wa-btn-ghost" onClick={reset}>Annuler</button>
              </div>
            </>
          )}
          {step === 'done' && (
            <>
              <h3>Entrée validée !</h3>
              {result.guest && <p><strong>{result.guest.firstName} {result.guest.lastName}</strong> — bienvenue !</p>}
              <button className="wa-btn wa-btn-ghost" style={{ marginTop:'.75rem' }} onClick={reset}>
                Scanner suivant
              </button>
            </>
          )}
          {result.type === 'error' && (
            <>
              <h3>Accès refusé</h3>
              <p>{result.message}</p>
              <button className="wa-btn wa-btn-ghost" style={{ marginTop:'.75rem' }} onClick={reset}>Réessayer</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
