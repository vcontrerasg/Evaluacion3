import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { dateTime, describeError, statusLabels } from '../../utils.js';

export default function AdminReservations() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useLoad(() => {
    const q = new URLSearchParams({ page: String(page), limit: '15' });
    if (status) q.set('status', status);
    return api(`/admin/reservations?${q.toString()}`);
  }, [status, page]);

  const items = data ? data.reservations : [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  async function change(id, next) {
    setActionError('');
    try {
      await api(`/admin/reservations/${id}`, { method: 'PATCH', body: { status: next } });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar definitivamente esta reserva?')) return;
    setActionError('');
    try {
      await api(`/admin/reservations/${id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Reservas</h2>
        <div className="field inline">
          <label htmlFor="f-status">Estado</label>
          <select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {loading && <p className="status-inline">Cargando reservas</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Cliente</th><th>Servicio</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.user ? <>{r.user.name}<br /><span className="muted">{r.user.email}</span></> : 'Usuario eliminado'}</td>
                <td>{r.service ? r.service.name : 'Servicio eliminado'}</td>
                <td>{dateTime(r.startsAt)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="row-actions">
                  {r.status !== 'confirmed' && <button type="button" className="btn btn-small btn-outline-dark" onClick={() => change(r.id, 'confirmed')}>Confirmar</button>}
                  {r.status !== 'cancelled' && <button type="button" className="btn btn-small btn-outline-dark" onClick={() => change(r.id, 'cancelled')}>Cancelar</button>}
                  <button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan="5">No hay reservas para mostrar.</td></tr>}
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
