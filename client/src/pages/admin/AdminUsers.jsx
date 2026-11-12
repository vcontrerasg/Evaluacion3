import { useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLoad from '../../hooks/useLoad.js';
import { describeError } from '../../utils.js';

const roleLabels = { user: 'Usuario', admin: 'Administrador' };
const emptyForm = { name: '', email: '', password: '', role: 'user' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useLoad(() => {
    const q = new URLSearchParams({ page: String(page), limit: '15' });
    if (search) q.set('search', search);
    if (role) q.set('role', role);
    return api(`/admin/users?${q.toString()}`);
  }, [search, role, page]);

  const users = data ? data.users : [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  async function update(id, body) {
    setActionError('');
    setNotice('');
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body });
      await reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    setNotice('');
    try {
      await api('/admin/users', { method: 'POST', body: { ...form, name: form.name.trim(), email: form.email.trim() } });
      setForm(emptyForm);
      setNotice('Usuario creado');
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Usuarios</h2>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
      >
        <div className="field inline">
          <label htmlFor="u-search">Buscar</label>
          <input id="u-search" type="search" maxLength="50" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div className="field inline">
          <label htmlFor="u-role">Perfil</label>
          <select id="u-role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button type="submit" className="btn btn-small btn-primary">Buscar</button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {loading && <p className="status-inline">Cargando usuarios</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>{u.name}{self && <span className="muted"> (tú)</span>}</td>
                  <td>{u.email}</td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${u.id}`}>Perfil de {u.name}</label>
                    <select id={`role-${u.id}`} value={u.role} disabled={self} onChange={(e) => update(u.id, { role: e.target.value })}>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions">
                    <span>{u.active ? 'Activa' : 'Desactivada'}</span>
                    <button type="button" className="btn btn-small btn-outline-dark" disabled={self} onClick={() => update(u.id, { active: !u.active })}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && <tr><td colSpan="4">No se encontraron usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" className="btn btn-small btn-outline-dark" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>

      <h3 className="form-title">Crear usuario</h3>
      <form className="form panel" onSubmit={create} noValidate>
        <div className="field-row">
          <div className="field">
            <label htmlFor="n-name">Nombre</label>
            <input id="n-name" type="text" maxLength="80" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="n-email">Correo</label>
            <input id="n-email" type="email" maxLength="120" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="n-pass">Contraseña inicial</label>
            <input id="n-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <p className="field-help">Mínimo 10 caracteres, con una letra y un número.</p>
          </div>
          <div className="field">
            <label htmlFor="n-role">Perfil</label>
            <select id="n-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>Crear usuario</button>
        </div>
      </form>
    </>
  );
}
