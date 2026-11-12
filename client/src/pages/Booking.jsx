import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import useLoad from '../hooks/useLoad.js';
import { describeError, dateTime, isoDate, money, timeOnly } from '../utils.js';

export default function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, error: loadError, loading } = useLoad(() => api('/services', { auth: false }), []);
  const services = data ? data.services : [];

  const [serviceId, setServiceId] = useState(params.get('servicio') || '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const max = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const service = services.find((s) => s.id === serviceId);

  async function loadSlots(sid, d) {
    setSelected('');
    if (!sid || !d) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await api(`/services/${sid}/availability?date=${d}`, { auth: false });
      setSlots(res.slots);
      setError('');
    } catch (err) {
      setSlots([]);
      setError(describeError(err));
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    loadSlots(serviceId, date);
  }, [serviceId, date]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!serviceId || !selected) {
      setError('Elige un servicio, una fecha y un horario');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/reservations', {
        method: 'POST',
        body: { serviceId, startsAt: selected, ...(notes.trim() ? { notes: notes.trim() } : {}) }
      });
      navigate('/cuenta', { replace: true, state: { reserved: true } });
    } catch (err) {
      setError(describeError(err));
      if (err.code === 'slot_taken') loadSlots(serviceId, date);
    } finally {
      setBusy(false);
    }
  }

  const available = slots.filter((s) => s.available);

  return (
    <section className="page narrow-wide">
      <h1>Reservar una hora</h1>
      {loading && <p className="status-inline">Cargando servicios</p>}
      {loadError && <p className="form-error" role="alert">{loadError}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="servicio">Servicio</label>
          <select id="servicio" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecciona un servicio</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {service && (
            <p className="field-help">{service.durationMinutes} minutos · {money(service.price)}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            type="date"
            value={date}
            min={isoDate(today)}
            max={isoDate(max)}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="field-help">Atención de lunes a viernes, de 09:00 a 18:00.</p>
        </div>

        {serviceId && date && (
          <fieldset className="slots">
            <legend>Horarios disponibles</legend>
            {slotsLoading && <p className="status-inline">Consultando horarios</p>}
            {!slotsLoading && available.length === 0 && (
              <p className="field-help">No hay horarios disponibles para esta fecha. Prueba con otro día.</p>
            )}
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  className={s.startsAt === selected ? 'slot active' : 'slot'}
                  disabled={!s.available}
                  aria-pressed={s.startsAt === selected}
                  onClick={() => setSelected(s.startsAt)}
                >
                  {timeOnly(s.startsAt)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="field">
          <label htmlFor="notas">Notas (opcional)</label>
          <textarea id="notas" rows="3" maxLength="300" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="field-help">{notes.length} de 300 caracteres</p>
        </div>

        {selected && service && (
          <p className="summary-line">
            <strong>{service.name}</strong>, {dateTime(selected)}
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || !selected}>
          {busy ? 'Reservando' : 'Confirmar reserva'}
        </button>
      </form>
    </section>
  );
}
