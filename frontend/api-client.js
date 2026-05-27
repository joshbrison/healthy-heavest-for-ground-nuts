// Lightweight API client exposed on `window.hhApi`
// Keep this file framework-agnostic so it can be used from inline scripts.

(function () {
  const DEFAULT_BASE_URL = '/api';

  function getBaseUrl() {
    const fromGlobal =
      typeof window !== 'undefined' &&
      window.HEALTHY_HARVEST_API_BASE_URL &&
      String(window.HEALTHY_HARVEST_API_BASE_URL).trim();
    return fromGlobal || DEFAULT_BASE_URL;
  }

  async function request(path, options = {}) {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, options);
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        (body && body.message) ||
        (body && body.error) ||
        (typeof body === 'string' ? body : '') ||
        `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return body;
  }

  async function plantCheck(file) {
    const formData = new FormData();
    formData.append('image', file);
    return request('/plant/check', { method: 'POST', body: formData });
  }

  async function plantDiagnose(files) {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : [];
    list.forEach((file) => formData.append('images', file));
    return request('/plant/diagnose', { method: 'POST', body: formData });
  }

  async function status() {
    return request('/status');
  }

  window.hhApi = Object.freeze({
    request,
    plantCheck,
    plantDiagnose,
    status,
  });
})();
