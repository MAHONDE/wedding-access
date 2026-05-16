/* Wedding Access · API Client */
;(function (global) {
  'use strict';

  const cfg = () => global.WA_CONFIG || { apiBase: '/api' };

  let _token = localStorage.getItem('wa_token') || null;

  function setToken(t) {
    _token = t;
    if (t) localStorage.setItem('wa_token', t);
    else localStorage.removeItem('wa_token');
  }

  async function req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = 'Bearer ' + _token;
    const res = await fetch(cfg().apiBase + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      setToken(null);
      global.dispatchEvent(new Event('wa:auth-expired'));
      throw new Error('Session expirée');
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) throw new Error(data?.message || data || res.statusText);
    return data;
  }

  const get  = (p)    => req('GET',    p);
  const post = (p, b) => req('POST',   p, b);
  const put  = (p, b) => req('PUT',    p, b);
  const del  = (p)    => req('DELETE', p);
  const patch = (p, b) => req('PATCH', p, b);

  async function downloadBlob(path, filename) {
    const headers = {};
    if (_token) headers['Authorization'] = 'Bearer ' + _token;
    const res = await fetch(cfg().apiBase + path, { headers });
    if (res.status === 401) {
      setToken(null);
      global.dispatchEvent(new Event('wa:auth-expired'));
      throw new Error('Session expirée');
    }
    if (!res.ok) throw new Error('Téléchargement échoué');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  global.WA = {
    /* Auth */
    auth: {
      login:   (email, password) => post('/auth/login', { email, password }),
      me:      ()                => get('/auth/me'),
      logout:  ()                => { setToken(null); },
      setToken,
      getToken: () => _token,
    },

    /* Branding */
    branding: {
      get:    ()       => get('/branding'),
      update: (data)   => patch('/branding', data),
    },

    /* Ceremonies */
    ceremonies: {
      list:   ()    => get('/ceremonies'),
      get:    (id)  => get(`/ceremonies/${id}`),
      create: (d)   => post('/ceremonies', d),
      update: (id, d) => put(`/ceremonies/${id}`, d),
    },

    /* Guests */
    guests: {
      list:   (cId, q) => get(`/guests?ceremonyId=${cId}${q ? '&q='+encodeURIComponent(q) : ''}`),
      get:    (id)  => get(`/guests/${id}`),
      create: (d)   => post('/guests', d),
      update: (id, d) => put(`/guests/${id}`, d),
      delete: (id)  => del(`/guests/${id}`),
      import: (cId, csv) => post(`/guests/import`, { ceremonyId: cId, csv }),
      stats:  (cId) => get(`/guests/stats${cId ? '?ceremonyId='+cId : ''}`),
    },

    /* QR codes */
    qr: {
      generate: (guestId) => post(`/qr/${guestId}`),
      regenerate: (guestId) => post(`/qr/${guestId}/regenerate`),
    },

    /* Invitations */
    invitations: {
      generate: (guestId) => post(`/invitations/${guestId}`),
      generateAndDownload: async (guestId) => {
        const inv = await post(`/invitations/${guestId}`);
        await downloadBlob(`/invitations/${inv.id}/download`, inv.fileName || `invitation-${guestId}.pdf`);
      },
    },

    /* Seating */
    tables: {
      list:   (cId) => get(`/seating?ceremonyId=${cId}`),
      create: (d)   => post('/seating', d),
      update: (id, d) => put(`/seating/${id}`, d),
      delete: (id)  => del(`/seating/${id}`),
      assign: (guestId, tableId) => patch(`/seating/assign`, { guestId, tableId }),
    },

    /* Scans */
    scan: {
      verify:    (token) => post('/scans/verify',     { token }),
      markEntry: (token) => post('/scans/mark-entry', { token }),
      history:   (cId, p) => get(`/scans/history?ceremonyId=${cId}&page=${p||1}`),
    },

    /* Live stats */
    stats: {
      live: (cId) => get(`/stats/live?ceremonyId=${cId}`),
    },

    /* Users */
    users: {
      list:   ()    => get('/users'),
      create: (d)   => post('/users', d),
      update: (id, d) => put(`/users/${id}`, d),
      delete: (id)  => del(`/users/${id}`),
    },
  };
})(window);
