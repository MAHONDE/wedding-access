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

  async function uploadFile(path, formData) {
    const headers = {};
    if (_token) headers['Authorization'] = 'Bearer ' + _token;
    const res = await fetch(cfg().apiBase + path, {
      method: 'POST',
      headers, // No Content-Type — browser sets multipart boundary automatically
      body: formData,
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

  const get   = (p)    => req('GET',    p);
  const post  = (p, b) => req('POST',   p, b);
  const put   = (p, b) => req('PUT',    p, b);
  const del   = (p)    => req('DELETE', p);
  const patch = (p, b) => req('PATCH',  p, b);

  /* Build URL for a stored file (served by /files/:type/:filename) */
  function fileUrl(filePath, type) {
    if (!filePath) return null;
    const fn = filePath.replace(/\\/g, '/').split('/').pop();
    return cfg().apiBase + '/files/' + type + '/' + fn;
  }

  global.WA = {
    /* ── Auth ── */
    auth: {
      login:    (email, password) => post('/auth/login', { email, password }),
      me:       ()                => get('/auth/me'),
      logout:   ()                => { setToken(null); },
      setToken,
      getToken: () => _token,
    },

    /* ── Branding ── */
    branding: {
      get:             ()     => get('/branding'),
      update:          (data) => patch('/branding', data),
      uploadMonogram:  (file) => {
        const fd = new FormData(); fd.append('file', file);
        return uploadFile('/branding/monogram', fd);
      },
      deleteMonogram:  ()     => req('DELETE', '/branding/monogram'),
      uploadLogo:      (file) => {
        const fd = new FormData(); fd.append('file', file);
        return uploadFile('/branding/logo', fd);
      },
      deleteLogo:      ()     => req('DELETE', '/branding/logo'),
      fileUrl,
    },

    /* ── Ceremonies ── */
    ceremonies: {
      list:   ()       => get('/ceremonies'),
      get:    (id)     => get(`/ceremonies/${id}`),
      create: (d)      => post('/ceremonies', d),
      update: (id, d)  => put(`/ceremonies/${id}`, d),
    },

    /* ── Guests ── */
    guests: {
      list:   (cId, q) => get(`/guests?ceremonyId=${cId || ''}${q ? '&q=' + encodeURIComponent(q) : ''}`),
      get:    (id)     => get(`/guests/${id}`),
      create: (d)      => post('/guests', d),
      update: (id, d)  => put(`/guests/${id}`, d),
      delete: (id)     => del(`/guests/${id}`),
      import: (cId, csv) => post('/guests/import', { ceremonyId: cId, csv }),
      stats:  (cId)   => get(`/guests/stats${cId ? '?ceremonyId=' + cId : ''}`),
    },

    /* ── QR codes ── */
    qr: {
      generate:   (guestId) => post(`/qr/${guestId}`),
      regenerate: (guestId) => post(`/qr/${guestId}`),
    },

    /* ── Templates ── */
    templates: {
      upload: (ceremonyId, file, name) => {
        const fd = new FormData();
        fd.append('file', file);
        if (name) fd.append('name', name);
        return uploadFile(`/templates/${ceremonyId}`, fd);
      },
      getActive:  (ceremonyId) => get(`/templates/${ceremonyId}`),
      setQrZone:  (ceremonyId, config) => post(`/templates/${ceremonyId}/qr-zone`, config),
      deactivate: (ceremonyId) => del(`/templates/${ceremonyId}`),
    },

    /* ── Invitations ── */
    invitations: {
      generate: (guestId) => post(`/invitations/${guestId}`),
      regenerate: (guestId) => post(`/invitations/${guestId}/regenerate`),
      bulk: (ceremonyId) => post('/invitations/bulk', { ceremonyId }),
      generateAndDownload: async (guestId) => {
        const inv = await post(`/invitations/${guestId}`);
        await downloadBlob(`/invitations/${inv.id}/download`, inv.fileName || `invitation-${guestId}.pdf`);
        return inv;
      },
      regenerateAndDownload: async (guestId) => {
        const inv = await post(`/invitations/${guestId}/regenerate`);
        await downloadBlob(`/invitations/${inv.id}/download`, inv.fileName || `invitation-${guestId}.pdf`);
        return inv;
      },
      download: (id, fileName) => downloadBlob(`/invitations/${id}/download`, fileName || 'invitation.pdf'),
      updateStatus: (id, status) => patch(`/invitations/${id}/status`, { status }),
    },

    /* ── Seating ── */
    tables: {
      list:   (cId)    => get(`/seating?ceremonyId=${cId}`),
      create: (d)      => post('/seating', d),
      update: (id, d)  => put(`/seating/${id}`, d),
      delete: (id)     => del(`/seating/${id}`),
      assign: (guestId, tableId) => patch('/seating/assign', { guestId, tableId }),
    },

    /* ── Scans ── */
    scan: {
      verify:    (token, deviceInfo) => post('/scans/verify',     { token, deviceInfo }),
      markEntry: (token, deviceInfo) => post('/scans/mark-entry', { token, deviceInfo }),
      history:   (cId, p)            => get(`/scans/history?ceremonyId=${cId || ''}&page=${p || 1}`),
    },

    /* ── Live stats ── */
    stats: {
      live: (cId) => get(`/stats/live?ceremonyId=${cId}`),
    },

    /* ── Users ── */
    users: {
      list:   ()       => get('/users'),
      create: (d)      => post('/users', d),
      update: (id, d)  => put(`/users/${id}`, d),
      delete: (id)     => del(`/users/${id}`),
    },

    /* Utility */
    fileUrl,
  };
})(window);
