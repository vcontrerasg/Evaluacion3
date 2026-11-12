import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { describeError } from '../utils.js';

const WELCOME = 'Hola, soy el asistente virtual de Andes Consultores. Puedo ayudarte con horarios, servicios, reservas y contacto.';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const sessionId = useRef(undefined);
  const nextId = useRef(1);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const toggleRef = useRef(null);
  const started = useRef(false);

  const push = (from, text, source) => {
    const id = nextId.current;
    nextId.current += 1;
    setMessages((m) => [...m, { id, from, text, source }]);
  };

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    push('bot', WELCOME);
    api('/chat/suggestions', { auth: false })
      .then((data) => setSuggestions(data.suggestions))
      .catch(() => setSuggestions([]));
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  function close() {
    setOpen(false);
    if (toggleRef.current) toggleRef.current.focus();
  }

  async function send(text) {
    const message = text.trim();
    if (!message || busy) return;
    push('user', message);
    setInput('');
    setSuggestions([]);
    setBusy(true);
    try {
      const data = await api('/chat', {
        method: 'POST',
        auth: false,
        body: { message, ...(sessionId.current ? { sessionId: sessionId.current } : {}) }
      });
      sessionId.current = data.sessionId;
      push('bot', data.reply, data.source);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      push('bot', describeError(err), 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') close();
  }

  return (
    <div className="chat" onKeyDown={handleKeyDown}>
      {open && (
        <section className="chat-panel" role="dialog" aria-label="Asistente virtual">
          <header className="chat-head">
            <h2>Asistente virtual</h2>
            <button type="button" className="chat-close" onClick={close} aria-label="Cerrar el asistente">
              Cerrar
            </button>
          </header>

          <div className="chat-log" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.from}${m.source === 'error' ? ' error' : ''}`}>
                <p>{m.text}</p>
                {m.source === 'ai' && <span className="chat-tag">Respuesta generada con IA. Puede contener errores.</span>}
              </div>
            ))}
            {busy && <p className="chat-typing" role="status">Escribiendo</p>}
          </div>

          {suggestions.length > 0 && (
            <ul className="chat-chips" aria-label="Preguntas sugeridas">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => send(s.question)} disabled={busy}>{s.question}</button>
                </li>
              ))}
            </ul>
          )}

          <form className="chat-form" onSubmit={handleSubmit}>
            <label htmlFor="chat-input" className="sr-only">Escribe tu pregunta</label>
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              maxLength="300"
              autoComplete="off"
              placeholder="Escribe tu pregunta"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>Enviar</button>
          </form>
          <p className="chat-note">No ingreses contraseñas ni datos personales. Las preguntas que no estén cubiertas pueden procesarse con un servicio de IA externo.</p>
        </section>
      )}
      <button
        type="button"
        ref={toggleRef}
        className="chat-toggle"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? 'Cerrar asistente' : 'Asistente'}
      </button>
    </div>
  );
}
