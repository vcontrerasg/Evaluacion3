const message = {
  to: 'cliente@ejemplo.cl',
  toName: 'Camila Rojas',
  replyTo: 'respuesta@ejemplo.cl',
  subject: 'Asunto de prueba',
  text: 'Texto plano',
  html: '<p>Texto</p>'
};

const baseEnv = { ...process.env };

function loadMail(overrides) {
  let mod;
  jest.isolateModules(() => {
    Object.assign(process.env, overrides);
    mod = require('../src/services/mail.service');
  });
  return mod;
}

afterEach(() => {
  process.env = { ...baseEnv };
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('proveedores de correo por API', () => {
  test('Brevo recibe la solicitud con la clave en el encabezado y el remitente configurado', async () => {
    const mail = loadMail({ MAIL_PROVIDER: 'brevo', MAIL_API_KEY: 'clave-brevo', MAIL_FROM_EMAIL: 'no-reply@andes.test' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201 });

    expect(await mail.sendMail(message)).toBe('sent');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers['api-key']).toBe('clave-brevo');
    const body = JSON.parse(options.body);
    expect(body.sender.email).toBe('no-reply@andes.test');
    expect(body.to[0]).toEqual({ email: 'cliente@ejemplo.cl', name: 'Camila Rojas' });
    expect(body.replyTo.email).toBe('respuesta@ejemplo.cl');
    expect(body.subject).toBe('Asunto de prueba');
    expect(body.htmlContent).toBe('<p>Texto</p>');
    expect(body.textContent).toBe('Texto plano');
  });

  test('Resend recibe la solicitud con autorización Bearer', async () => {
    const mail = loadMail({ MAIL_PROVIDER: 'resend', MAIL_API_KEY: 'clave-resend', MAIL_FROM_EMAIL: 'no-reply@andes.test' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    expect(await mail.sendMail(message)).toBe('sent');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.headers.Authorization).toBe('Bearer clave-resend');
    const body = JSON.parse(options.body);
    expect(body.from).toContain('no-reply@andes.test');
    expect(body.to).toEqual(['cliente@ejemplo.cl']);
    expect(body.reply_to).toBe('respuesta@ejemplo.cl');
  });

  test('un rechazo del proveedor genera un error que no expone la clave', async () => {
    const mail = loadMail({ MAIL_PROVIDER: 'brevo', MAIL_API_KEY: 'clave-secreta-123', MAIL_FROM_EMAIL: 'no-reply@andes.test' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    const error = await mail.sendMail(message).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('401');
    expect(`${error.message}${error.stack}`).not.toContain('clave-secreta-123');
  });

  test('sin proveedor configurado el envío se omite fuera de las pruebas', async () => {
    const mail = loadMail({ MAIL_PROVIDER: 'none', NODE_ENV: 'development' });
    global.fetch = jest.fn();
    expect(await mail.sendMail(message)).toBe('skipped');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('la configuración falla al iniciar si falta la clave del proveedor', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.MAIL_API_KEY;
    expect(() => loadMail({ MAIL_PROVIDER: 'brevo', MAIL_FROM_EMAIL: 'no-reply@andes.test' })).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
