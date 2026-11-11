import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page narrow">
      <h1>Página no encontrada</h1>
      <p>La dirección que ingresaste no existe o fue movida.</p>
      <Link to="/" className="btn btn-primary">Volver al inicio</Link>
    </section>
  );
}
