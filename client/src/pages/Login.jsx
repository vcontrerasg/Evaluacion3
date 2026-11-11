import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateEmail } from '../validation.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {
      email: validateEmail(form.email),
      password: form.password ? '' : 'Ingresa tu contraseña'
    };
    setErrors(next);
    setFormError('');
    if (next.email || next.password) return;

    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      const target = location.state && location.state.from ? location.state.from : user.role === 'admin' ? '/admin' : '/cuenta';
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow">
      <h1>Ingresar</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
          {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" value={form.password} onChange={update('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
          {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Ingresando' : 'Ingresar'}</button>
      </form>
      <p className="alt">¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
    </section>
  );
}
