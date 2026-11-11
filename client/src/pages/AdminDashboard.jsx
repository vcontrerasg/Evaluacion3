import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="page">
      <h1>Panel administrativo</h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!summary && !error && <p className="status-line">Cargando resumen</p>}
      {summary && (
        <dl className="metrics">
          <div><dt>Usuarios registrados</dt><dd>{summary.users.total}</dd></div>
          <div><dt>Cuentas activas</dt><dd>{summary.users.active}</dd></div>
          <div><dt>Administradores</dt><dd>{summary.users.admins}</dd></div>
        </dl>
      )}
    </section>
  );
}
