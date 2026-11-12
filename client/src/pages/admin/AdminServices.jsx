import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import { describeError, money } from '../../utils.js';

const empty = { name: '', description: '', durationMinutes: 60, price: 0, active: true };

export default function AdminServices() {
  const { data, error, loading, reload } = useLoad(() => api('/admin/services'), []);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const services = data ? data.services : [];
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function edit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      active: service.active
    });
    setFormError('');
    setNotice('');
  }

  function reset() {
    setEditingId('');
    setForm(empty);
    setFormError('');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    setNotice('');
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
      active: Boolean(form.active)
    };
    try {
      if (editingId) {
        await api(`/admin/services/${editingId}`, { method: 'PATCH', body });
        setNotice('Servicio actualizado');
      } else {
        await api('/admin/services', { method: 'POST', body });
        setNotice('Servicio creado');
      }
      reset();
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(service) {
    setNotice('');
    try {
      await api(`/admin/services/${service.id}`, { method: 'PATCH', body: { active: !service.active } });
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  async function remove(service) {
    if (!window.confirm(`¿Eliminar el servicio "${service.name}"?`)) return;
    setNotice('');
    setFormError('');
    try {
      await api(`/admin/services/${service.id}`, { method: 'DELETE' });
      setNotice('Servicio eliminado');
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  return (
    <>
      <h2>Servicios</h2>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {loading && <p className="status-inline">Cargando servicios</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Nombre</th><th>Duración</th><th>Valor</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.durationMinutes} min</td>
                <td>{money(s.price)}</td>
                <td>{s.active ? 'Publicado' : 'Oculto'}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => edit(s)}>Editar</button>
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => toggle(s)}>{s.active ? 'Ocultar' : 'Publicar'}</button>
                  <button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(s)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && services.length === 0 && (
              <tr><td colSpan="5">No hay servicios creados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="form-title">{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h3>
      <form className="form panel" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="s-name">Nombre</label>
          <input id="s-name" type="text" maxLength="80" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label htmlFor="s-desc">Descripción</label>
          <textarea id="s-desc" rows="3" maxLength="500" value={form.description} onChange={set('description')} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="s-dur">Duración (minutos)</label>
            <input id="s-dur" type="number" min="15" max="240" step="5" value={form.durationMinutes} onChange={set('durationMinutes')} />
          </div>
          <div className="field">
            <label htmlFor="s-price">Valor (CLP)</label>
            <input id="s-price" type="number" min="0" step="1000" value={form.price} onChange={set('price')} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Publicado en el sitio
        </label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{editingId ? 'Guardar cambios' : 'Crear servicio'}</button>
          {editingId && <button type="button" className="btn btn-outline-dark" onClick={reset}>Cancelar edición</button>}
        </div>
      </form>
    </>
  );
}
