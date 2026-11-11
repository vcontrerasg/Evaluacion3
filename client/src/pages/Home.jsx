import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { site } from '../config/site.js';

function Ridges() {
  return (
    <svg className="ridges" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 260 L0 150 L110 90 L200 140 L320 40 L430 130 L520 95 L640 170 L760 60 L880 150 L990 100 L1100 160 L1200 120 L1200 260 Z" fill="#164a63" />
      <path d="M0 260 L0 190 L90 150 L190 185 L300 120 L420 190 L540 150 L650 205 L770 140 L890 200 L1010 160 L1110 205 L1200 175 L1200 260 Z" fill="#1F6F8B" />
      <path d="M0 260 L0 225 L130 200 L250 230 L380 195 L510 235 L640 210 L780 240 L910 205 L1040 238 L1200 215 L1200 260 Z" fill="#F2F6F8" />
    </svg>
  );
}

const steps = [
  { title: 'Crea tu cuenta', text: 'Regístrate con tu correo. Tus datos quedan protegidos y solo tú puedes verlos.' },
  { title: 'Elige el servicio', text: 'Revisa las asesorías disponibles y selecciona la que necesitas.' },
  { title: 'Reserva tu hora', text: 'Escoge fecha y horario. Puedes consultar o cancelar tus reservas cuando quieras.' }
];

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>{site.tagline}</h1>
          <p className="lead">
            En {site.name} acompañamos a empresas y personas con asesoría profesional. Reserva en línea,
            sin llamadas ni esperas.
          </p>
          <div className="actions">
            {user ? (
              <Link to="/cuenta" className="btn btn-signal">Ir a mi cuenta</Link>
            ) : (
              <>
                <Link to="/registro" className="btn btn-signal">Crear cuenta</Link>
                <Link to="/ingresar" className="btn btn-outline">Ya tengo cuenta</Link>
              </>
            )}
          </div>
        </div>
        <Ridges />
      </section>

      <section className="page">
        <h2>Cómo reservar</h2>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="page tint">
        <h2>Tus datos, cuidados</h2>
        <p className="measure">
          Las contraseñas se guardan protegidas con bcrypt y nunca se muestran. Cada sesión caduca
          automáticamente, y cada persona accede únicamente a lo que le corresponde según su perfil.
        </p>
      </section>
    </>
  );
}
