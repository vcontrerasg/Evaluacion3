import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { site } from '../config/site.js';
import { describeError } from '../utils.js';
import { validateEmail } from '../validation.js';

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = 'Ingresa tu nombre';
  const email = validateEmail(form.email);
  if (email) errors.email = email;
  if (form.phone.trim() && !/^\+?[0-9][0-9 ()-]{6,19}$/.test(form.phone.trim())) errors.phone = 'Ingresa un teléfono válido';
  const subject = form.subject.trim();
  if (subject.length < 3) errors.subject = 'Ingresa un asunto';
  const message = form.message.trim();
  if (message.length < 10) errors.message = 'El mensaje debe tener al menos 10 caracteres';
  return errors;
}

export default function Contact() {
  const { user } = useAuth();
  const openedAt = useRef(Date.now());
  const [form, setForm] = useState({
    name: user ? user.name : '',
    email: user ? user.email : '',
    phone: '',
    subject: '',
    message: '',
    website: ''
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const result = await api('/contact', {
        method: 'POST',
        auth: false,
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
          subject: form.subject.trim(),
          message: form.message.trim(),
          website: form.website,
          elapsedMs: Date.now() - openedAt.current
        }
      });
      setConfirmed(Boolean(result && result.confirmationSent));
      setSent(true);
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...err.fields }));
      setFormError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSent(false);
    setForm((f) => ({ ...f, subject: '', message: '', website: '' }));
    openedAt.current = Date.now();
  }

  if (sent) {
    return (
      <section className="page narrow-wide">
        <h1>Mensaje enviado</h1>
        <p className="notice" role="status">
          {confirmed
            ? `Recibimos tu mensaje. Te enviamos una confirmación a ${form.email.trim()} y te responderemos a la brevedad.`
            : `Recibimos tu mensaje y te responderemos a ${form.email.trim()} a la brevedad.`}
        </p>
        <button type="button" className="btn btn-primary" onClick={reset}>Enviar otro mensaje</button>
      </section>
    );
  }

  return (
    <section className="page narrow-wide">
      <h1>Contacto</h1>
      <p className="measure">
        Escríbenos y te responderemos por correo. También puedes escribir directamente a {site.email}.
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">No completar este campo</label>
          <input id="website" name="website" type="text" tabIndex="-1" autoComplete="off" value={form.website} onChange={update('website')} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="c-name">Nombre</label>
            <input id="c-name" type="text" autoComplete="name" maxLength="80" value={form.name} onChange={update('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'c-name-error' : undefined} />
            {errors.name && <p id="c-name-error" className="field-error">{errors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor="c-email">Correo electrónico</label>
            <input id="c-email" type="email" autoComplete="email" maxLength="120" value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'c-email-error' : undefined} />
            {errors.email && <p id="c-email-error" className="field-error">{errors.email}</p>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="c-phone">Teléfono (opcional)</label>
            <input id="c-phone" type="tel" autoComplete="tel" maxLength="20" value={form.phone} onChange={update('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'c-phone-error' : undefined} />
            {errors.phone && <p id="c-phone-error" className="field-error">{errors.phone}</p>}
          </div>
          <div className="field">
            <label htmlFor="c-subject">Asunto</label>
            <input id="c-subject" type="text" maxLength="100" value={form.subject} onChange={update('subject')} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'c-subject-error' : undefined} />
            {errors.subject && <p id="c-subject-error" className="field-error">{errors.subject}</p>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="c-message">Mensaje</label>
          <textarea id="c-message" rows="6" maxLength="1000" value={form.message} onChange={update('message')} aria-invalid={Boolean(errors.message)} aria-describedby="c-message-help" />
          <p id="c-message-help" className={errors.message ? 'field-error' : 'field-help'}>
            {errors.message || `${form.message.length} de 1000 caracteres`}
          </p>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Enviando' : 'Enviar mensaje'}</button>
      </form>
    </section>
  );
}
