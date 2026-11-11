import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateEmail, validateName, validatePassword } from '../validation.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password)
    };
    setErrors(next);
    setFormError('');
    if (next.name || next.email || next.password) return;

    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/cuenta', { replace: true });
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...err.fields }));
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow">
      <h1>Crear cuenta</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Nombre completo</label>
          <input id="name" type="text" autoComplete="name" value={form.name} onChange={update('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p id="name-error" className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
          {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} aria-invalid={Boolean(errors.password)} aria-describedby="password-help" />
          <p id="password-help" className={errors.password ? 'field-error' : 'field-help'}>
            {errors.password || 'Mínimo 10 caracteres, con al menos una letra y un número.'}
          </p>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando cuenta' : 'Crear cuenta'}</button>
      </form>
      <p className="alt">¿Ya tienes cuenta? <Link to="/ingresar">Ingresar</Link></p>
    </section>
  );
}
