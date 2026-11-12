import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import { describeError, networkLabels } from '../../utils.js';

const empty = { network: 'instagram', url: '', label: '', order: 0, active: true };

export default function AdminSocial() {
  const { data, error, loading, reload } = useLoad(() => api('/admin/social-links'), []);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const links = data ? data.links : [];
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function edit(link) {
    setEditingId(link.id);
    setForm({ network: link.network, url: link.url, label: link.label, order: link.order, active: link.active });
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
    try {
      const common = { url: form.url.trim(), label: form.label.trim(), order: Number(form.order), active: Boolean(form.active) };
      if (editingId) {
        await api(`/admin/social-links/${editingId}`, { method: 'PATCH', body: common });
        setNotice('Enlace actualizado');
      } else {
        await api('/admin/social-links', { method: 'POST', body: { network: form.network, ...common } });
        setNotice('Enlace creado');
      }
      reset();
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(link) {
    setNotice('');
    try {
      await api(`/admin/social-links/${link.id}`, { method: 'PATCH', body: { active: !link.active } });
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  async function remove(link) {
    if (!window.confirm(`¿Eliminar el enlace de ${networkLabels[link.network]}?`)) return;
    setNotice('');
    try {
      await api(`/admin/social-links/${link.id}`, { method: 'DELETE' });
      setNotice('Enlace eliminado');
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  return (
    <>
      <h2>Redes sociales</h2>
      <p className="muted">Los enlaces activos se muestran en el pie de página del sitio. Solo se aceptan direcciones https de la red correspondiente.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {loading && <p className="status-inline">Cargando enlaces</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Red</th><th>Dirección</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td>{l.label || networkLabels[l.network]}</td>
                <td className="break">{l.url}</td>
                <td>{l.order}</td>
                <td>{l.active ? 'Visible' : 'Oculto'}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => edit(l)}>Editar</button>
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => toggle(l)}>{l.active ? 'Ocultar' : 'Mostrar'}</button>
                  <button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(l)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && links.length === 0 && <tr><td colSpan="5">No hay enlaces configurados.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 className="form-title">{editingId ? 'Editar enlace' : 'Nuevo enlace'}</h3>
      <form className="form panel" onSubmit={submit} noValidate>
        <div className="field-row">
          <div className="field">
            <label htmlFor="l-network">Red social</label>
            <select id="l-network" value={form.network} onChange={set('network')} disabled={Boolean(editingId)}>
              {Object.entries(networkLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="l-order">Orden</label>
            <input id="l-order" type="number" min="0" max="99" value={form.order} onChange={set('order')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="l-url">Dirección</label>
          <input id="l-url" type="url" maxLength="200" value={form.url} onChange={set('url')} />
        </div>
        <div className="field">
          <label htmlFor="l-label">Texto del enlace (opcional)</label>
          <input id="l-label" type="text" maxLength="40" value={form.label} onChange={set('label')} />
        </div>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Visible en el sitio
        </label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{editingId ? 'Guardar cambios' : 'Agregar enlace'}</button>
          {editingId && <button type="button" className="btn btn-outline-dark" onClick={reset}>Cancelar edición</button>}
        </div>
      </form>
    </>
  );
}
