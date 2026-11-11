let accessToken = null;
let onSessionLost = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function setSessionLostHandler(handler) {
  onSessionLost = handler;
}

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

async function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) return { res, data: null };
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

function toError(res, data) {
  const e = data && data.error ? data.error : {};
  return new ApiError(
    res.status,
    e.code || 'error',
    e.message || 'No se pudo completar la solicitud',
    e.fields
  );
}

export async function refreshSession() {
  const { res, data } = await send('/auth/refresh', { method: 'POST', auth: false });
  if (!res.ok) {
    accessToken = null;
    throw toError(res, data);
  }
  accessToken = data.accessToken;
  return data;
}

export async function api(path, options = {}) {
  let { res, data } = await send(path, options);

  if (res.status === 401 && data && data.error && data.error.code === 'token_expired' && options.auth !== false) {
    try {
      await refreshSession();
      ({ res, data } = await send(path, options));
    } catch {
      onSessionLost();
      throw toError(res, data);
    }
  }

  if (!res.ok) throw toError(res, data);
  return data;
}
