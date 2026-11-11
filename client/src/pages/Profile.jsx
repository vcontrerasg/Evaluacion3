import { useAuth } from '../context/AuthContext.jsx';

const roleNames = { admin: 'Administrador', user: 'Usuario registrado' };

export default function Profile() {
  const { user } = useAuth();
  const since = new Date(user.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section className="page narrow">
      <h1>Mi cuenta</h1>
      <dl className="data">
        <div><dt>Nombre</dt><dd>{user.name}</dd></div>
        <div><dt>Correo</dt><dd>{user.email}</dd></div>
        <div><dt>Perfil</dt><dd>{roleNames[user.role] || user.role}</dd></div>
        <div><dt>Cuenta creada</dt><dd>{since}</dd></div>
      </dl>
    </section>
  );
}
