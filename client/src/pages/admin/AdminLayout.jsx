import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <section className="page">
      <h1>Panel administrativo</h1>
      <nav className="tabs" aria-label="Secciones del panel">
        <NavLink to="/admin" end>Resumen</NavLink>
        <NavLink to="/admin/servicios">Servicios</NavLink>
        <NavLink to="/admin/reservas">Reservas</NavLink>
        <NavLink to="/admin/usuarios">Usuarios</NavLink>
        <NavLink to="/admin/redes">Redes sociales</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
