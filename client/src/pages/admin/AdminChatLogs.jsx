import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import { dateShort, describeError, sourceLabels } from '../../utils.js';

export default function AdminChatLogs() {
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useLoad(() => {
    const q = new URLSearchParams({ page: String(page), limit: '15' });
    if (source) q.set('source', source);
    return api(`/admin/chat-logs?${q.toString()}`);
  }, [source, page]);

  const logs = data ? data.logs : [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  async function remove(id) {
    if (!window.confirm('¿Eliminar esta conversación?')) return;
    setActionError('');
    try {
      await api(`/admin/chat-logs/${id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Conversaciones</h2>
        <div className="field inline">
          <label htmlFor="c-source">Origen</label>
          <select id="c-source" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="muted">
        Las conversaciones se eliminan automáticamente a los 30 días. Revisa las preguntas sin respuesta para decidir qué preguntas agregar al chatbot.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {loading && <p className="status-inline">Cargando conversaciones</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Fecha</th><th>Sesión</th><th>Pregunta</th><th>Respuesta</th><th>Origen</th><th>Acción</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{dateShort(l.createdAt)}</td>
                <td>{l.sessionId}</td>
                <td className="break">{l.message}</td>
                <td className="break">{l.reply}</td>
                <td><span className={`badge badge-${l.source}`}>{sourceLabels[l.source]}</span></td>
                <td><button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(l.id)}>Eliminar</button></td>
              </tr>
            ))}
            {!loading && logs.length === 0 && <tr><td colSpan="6">No hay conversaciones registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </>
  );
}
