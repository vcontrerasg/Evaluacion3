import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';

export default function AdminDashboard() {
  const { data, error, loading } = useLoad(() => api('/admin/summary'), []);

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="status-inline">Cargando resumen</p>}
      {data && (
        <dl className="metrics">
          <div><dt>Usuarios registrados</dt><dd>{data.users.total}</dd></div>
          <div><dt>Cuentas activas</dt><dd>{data.users.active}</dd></div>
          <div><dt>Administradores</dt><dd>{data.users.admins}</dd></div>
          <div><dt>Servicios activos</dt><dd>{data.services.active}</dd></div>
          <div><dt>Mensajes nuevos</dt><dd>{data.contactMessages.new}</dd></div>
          <div><dt>Reservas pendientes</dt><dd>{data.reservations.pending}</dd></div>
          <div><dt>Reservas confirmadas</dt><dd>{data.reservations.confirmed}</dd></div>
          <div><dt>Reservas próximas</dt><dd>{data.reservations.upcoming}</dd></div>
          <div><dt>Redes publicadas</dt><dd>{data.socialLinks.active}</dd></div>
        </dl>
      )}
    </>
  );
}
