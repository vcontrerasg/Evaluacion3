import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { site } from '../config/site.js';
import { networkLabels } from '../utils.js';

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M2 27 L12 9 L18 19 L22 13 L30 27 Z" fill="currentColor" />
      <path d="M12 9 L15 14.2 L12 16 L9.6 14 Z" fill="#F2F6F8" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    api('/social-links', { auth: false })
      .then((data) => setLinks(data.links.filter((l) => typeof l.url === 'string' && l.url.startsWith('https://'))))
      .catch(() => setLinks([]));
  }, []);

  const close = () => setOpen(false);

  async function handleLogout() {
    close();
    await logout();
    navigate('/');
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="bar">
          <Link to="/" className="brand" onClick={close}>
            <Mark />
            <span>{site.name}</span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="menu-principal"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Cerrar' : 'Menú'}
          </button>
          <nav id="menu-principal" className={open ? 'nav open' : 'nav'} aria-label="Principal">
            <NavLink to="/" end onClick={close}>Inicio</NavLink>
            {user && <NavLink to="/reservar" onClick={close}>Reservar</NavLink>}
            <NavLink to="/contacto" onClick={close}>Contacto</NavLink>
            {user && <NavLink to="/cuenta" onClick={close}>Mi cuenta</NavLink>}
            {user && user.role === 'admin' && <NavLink to="/admin" onClick={close}>Panel</NavLink>}
            {!user && <NavLink to="/ingresar" onClick={close}>Ingresar</NavLink>}
            {!user && (
              <Link to="/registro" className="btn btn-signal" onClick={close}>Crear cuenta</Link>
            )}
            {user && (
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>Cerrar sesión</button>
            )}
          </nav>
        </div>
      </header>
      <main id="contenido">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="bar footer-grid">
          <div>
            <p className="footer-name">{site.name}</p>
            <p>{site.city}</p>
            <p>{site.email}</p>
          </div>
          {links.length > 0 && (
            <nav aria-label="Redes sociales">
              <ul className="social-list">
                {links.map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label || networkLabels[l.network] || l.network}
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </footer>
    </>
  );
}
