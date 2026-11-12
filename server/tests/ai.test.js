const baseEnv = { ...process.env };

function loadAi(overrides) {
  let mod;
  jest.isolateModules(() => {
    Object.assign(process.env, overrides);
    mod = require('../src/services/ai.service');
  });
  return mod;
}

const context = { message: '¿Pueden ayudarme con mis impuestos?', services: [], faqs: [] };

afterEach(() => {
  process.env = { ...baseEnv };
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('proveedor de IA (Groq)', () => {
  test('envía la solicitud con el formato compatible, la clave en el encabezado y límites de salida', async () => {
    const ai = loadAi({ CHAT_AI_PROVIDER: 'groq', CHAT_AI_API_KEY: 'clave-groq', CHAT_AI_MODEL: 'modelo-de-prueba' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: ' Claro, te ayudamos. ' } }] }) });

    expect(ai.isEnabled()).toBe(true);
    expect(await ai.ask(context)).toBe('Claro, te ayudamos.');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer clave-groq');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('modelo-de-prueba');
    expect(body.max_tokens).toBeLessThanOrEqual(300);
    expect(body.temperature).toBeLessThanOrEqual(0.3);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'user', content: context.message });
  });

  test('un rechazo del proveedor genera un error que no expone la clave', async () => {
    const ai = loadAi({ CHAT_AI_PROVIDER: 'groq', CHAT_AI_API_KEY: 'clave-secreta-999' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const error = await ai.ask(context).catch((e) => e);
    expect(error.message).toContain('429');
    expect(`${error.message}${error.stack}`).not.toContain('clave-secreta-999');
  });

  test('una respuesta sin contenido devuelve null', async () => {
    const ai = loadAi({ CHAT_AI_PROVIDER: 'groq', CHAT_AI_API_KEY: 'clave' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [] }) });
    expect(await ai.ask(context)).toBeNull();
  });

  test('sin proveedor la IA está desactivada y no hay llamadas de red', () => {
    const ai = loadAi({ CHAT_AI_PROVIDER: 'none' });
    global.fetch = jest.fn();
    expect(ai.isEnabled()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('la configuración falla al iniciar si falta la clave', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.CHAT_AI_API_KEY;
    expect(() => loadAi({ CHAT_AI_PROVIDER: 'groq' })).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('redacta correos, teléfonos y RUT antes de enviar el texto', () => {
    const ai = loadAi({});
    const out = ai.redact('Soy ana@correo.cl, llámame al +56 9 8765 4321 o al 12.345.678-5');
    expect(out).not.toMatch(/ana@correo|8765|12\.345/);
    expect(out).toContain('[correo]');
  });
});
