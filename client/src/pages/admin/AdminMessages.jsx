import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { dateShort, describeError, mailLabels } from '../../utils.js';

const filters = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'read', label: 'Leídos' },
  { value: 'archived', label: 'Archivados' }
];

export default function AdminMessages() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useLoad(() => {
    const q = new URLSearchParams({ page: String(page), limit: '10' });
    if (status) q.set('status', status);
    return api(`/admin/contact-messages?${q.toString()}`);
  }, [status, page]);

  const items = data ? data.messages : [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  async function change(id, next) {
    setActionError('');
    try {
      await api(`/admin/contact-messages/${id}`, { method: 'PATCH', body: { status: next } });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar definitivamente este mensaje?')) return;
    setActionError('');
    try {
      await api(`/admin/contact-messages/${id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Mensajes de contacto</h2>
        <div className="field inline">
          <label htmlFor="m-status">Mostrar</label>
          <select id="m-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {filters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {loading && <p className="status-inline">Cargando mensajes</p>}
      {!loading && !error && items.length === 0 && <p>No hay mensajes para mostrar.</p>}

      <ul className="message-list">
        {items.map((m) => (
          <li key={m.id} className={m.status === 'new' ? 'message unread' : 'message'}>
            <div className="message-head">
              <h3>{m.subject}</h3>
              <StatusBadge status={m.status} />
            </div>
            <p className="message-meta">
              {m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ''} · {dateShort(m.createdAt)}
            </p>
            <p className="message-body">{m.message}</p>
            <p className="muted">
              Notificación: {mailLabels[m.mail.notification]} · Confirmación al cliente: {mailLabels[m.mail.confirmation]}
            </p>
            <div className="row-actions">
              <a className="btn btn-small btn-primary" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>Responder</a>
              {m.status !== 'read' && <button type="button" className="btn btn-small btn-outline-dark" onClick={() => change(m.id, 'read')}>Marcar como leído</button>}
              {m.status !== 'new' && <button type="button" className="btn btn-small btn-outline-dark" onClick={() => change(m.id, 'new')}>Marcar como nuevo</button>}
              {m.status !== 'archived' && <button type="button" className="btn btn-small btn-outline-dark" onClick={() => change(m.id, 'archived')}>Archivar</button>}
              <button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(m.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="pager">
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </>
  );
}
