import { useState } from 'react';
import { api } from '../../api/client.js';
import useLoad from '../../hooks/useLoad.js';
import { describeError } from '../../utils.js';

const empty = { question: '', keywords: '', answer: '', order: 0, active: true };

function parseKeywords(text) {
  return text
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export default function AdminChatbot() {
  const { data, error, loading, reload } = useLoad(() => api('/admin/chat-faqs'), []);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const faqs = data ? data.faqs : [];
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function edit(faq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, keywords: faq.keywords.join(', '), answer: faq.answer, order: faq.order, active: faq.active });
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
      question: form.question.trim(),
      keywords: parseKeywords(form.keywords),
      answer: form.answer.trim(),
      order: Number(form.order),
      active: Boolean(form.active)
    };
    try {
      if (editingId) {
        await api(`/admin/chat-faqs/${editingId}`, { method: 'PATCH', body });
        setNotice('Pregunta actualizada');
      } else {
        await api('/admin/chat-faqs', { method: 'POST', body });
        setNotice('Pregunta creada');
      }
      reset();
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(faq) {
    setNotice('');
    try {
      await api(`/admin/chat-faqs/${faq.id}`, { method: 'PATCH', body: { active: !faq.active } });
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  async function remove(faq) {
    if (!window.confirm(`¿Eliminar la pregunta "${faq.question}"?`)) return;
    setNotice('');
    try {
      await api(`/admin/chat-faqs/${faq.id}`, { method: 'DELETE' });
      setNotice('Pregunta eliminada');
      await reload();
    } catch (err) {
      setFormError(describeError(err));
    }
  }

  return (
    <>
      <h2>Preguntas del chatbot</h2>
      <p className="muted">
        El asistente responde con la pregunta cuyas palabras clave coincidan con lo que escribe la persona. Agrega variantes de una misma palabra (por ejemplo, reservar y reservo) y frases cortas. Cuando ninguna coincide, el asistente indica que no tiene respuesta y sugiere el formulario de contacto.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {loading && <p className="status-inline">Cargando preguntas</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr><th>Orden</th><th>Pregunta</th><th>Palabras clave</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {faqs.map((f) => (
              <tr key={f.id}>
                <td>{f.order}</td>
                <td>{f.question}</td>
                <td className="break">{f.keywords.join(', ') || 'Sin palabras clave'}</td>
                <td>{f.active ? 'Activa' : 'Oculta'}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => edit(f)}>Editar</button>
                  <button type="button" className="btn btn-small btn-outline-dark" onClick={() => toggle(f)}>{f.active ? 'Ocultar' : 'Activar'}</button>
                  <button type="button" className="btn btn-small btn-danger-outline" onClick={() => remove(f)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && faqs.length === 0 && <tr><td colSpan="5">No hay preguntas creadas.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 className="form-title">{editingId ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
      <form className="form panel" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="q-question">Pregunta</label>
          <input id="q-question" type="text" maxLength="150" value={form.question} onChange={set('question')} />
        </div>
        <div className="field">
          <label htmlFor="q-keywords">Palabras clave, separadas por coma</label>
          <input id="q-keywords" type="text" value={form.keywords} onChange={set('keywords')} />
          <p className="field-help">Hasta 15 palabras o frases cortas, de 2 a 30 caracteres cada una.</p>
        </div>
        <div className="field">
          <label htmlFor="q-answer">Respuesta</label>
          <textarea id="q-answer" rows="4" maxLength="800" value={form.answer} onChange={set('answer')} />
          <p className="field-help">{form.answer.length} de 800 caracteres</p>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="q-order">Orden</label>
            <input id="q-order" type="number" min="0" max="999" value={form.order} onChange={set('order')} />
          </div>
          <label className="check">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Activa
          </label>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{editingId ? 'Guardar cambios' : 'Crear pregunta'}</button>
          {editingId && <button type="button" className="btn btn-outline-dark" onClick={reset}>Cancelar edición</button>}
        </div>
      </form>
    </>
  );
}
