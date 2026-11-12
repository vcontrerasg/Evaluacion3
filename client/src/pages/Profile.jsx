import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import useLoad from '../hooks/useLoad.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { dateTime, describeError, money } from '../utils.js';

const roleNames = { admin: 'Administrador', user: 'Usuario registrado' };

export default function Profile() {
  const { user } = useAuth();
  const location = useLocation();
  const { data, error, loading, reload } = useLoad(() => api('/reservations/mine'), []);
  const [actionError, setActionError] = useState('');
  const since = new Date(user.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const reservations = data ? data.reservations : [];
  const now = Date.now();

  async function cancel(id) {
    if (!window.confirm('¿Quieres cancelar esta reserva?')) return;
    setActionError('');
    try {
      await api(`/reservations/${id}/cancel`, { method: 'PATCH' });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <section className="page">
      <h1>Mi cuenta</h1>
      {location.state && location.state.reserved && (
        <p className="notice" role="status">Tu reserva fue registrada y queda pendiente de confirmación.</p>
      )}

      <dl className="data">
        <div><dt>Nombre</dt><dd>{user.name}</dd></div>
        <div><dt>Correo</dt><dd>{user.email}</dd></div>
        <div><dt>Perfil</dt><dd>{roleNames[user.role] || user.role}</dd></div>
        <div><dt>Cuenta creada</dt><dd>{since}</dd></div>
      </dl>

      <div className="section-head">
        <h2>Mis reservas</h2>
        <Link to="/reservar" className="btn btn-primary">Nueva reserva</Link>
      </div>
      {loading && <p className="status-inline">Cargando reservas</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {!loading && !error && reservations.length === 0 && <p>Aún no tienes reservas.</p>}
      {reservations.length > 0 && (
        <ul className="reservation-list">
          {reservations.map((r) => (
            <li key={r.id}>
              <div>
                <h3>{r.service ? r.service.name : 'Servicio eliminado'}</h3>
                <p>{dateTime(r.startsAt)}{r.service ? ` · ${r.service.durationMinutes} min · ${money(r.service.price)}` : ''}</p>
                {r.notes && <p className="muted">{r.notes}</p>}
              </div>
              <StatusBadge status={r.status} />
              {r.status !== 'cancelled' && new Date(r.startsAt).getTime() > now ? (
                <button type="button" className="btn btn-small btn-danger-outline" onClick={() => cancel(r.id)}>Cancelar</button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
