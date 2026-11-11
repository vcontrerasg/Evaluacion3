import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="status-line">Verificando sesión</p>;
  if (!user) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <section className="page narrow">
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos para ver esta sección.</p>
      </section>
    );
  }
  return <Outlet />;
}
