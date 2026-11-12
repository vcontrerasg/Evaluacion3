# Andes Consultores

Plataforma web para un portal de servicios profesionales con reserva de horas en línea. Proyecto del Certamen práctico integrador de Desarrollo Web Seguro y DevSecOps.

## Integrantes

| Nombre completo | Identificación / sección |
|---|---|
| (completar) | (completar) |
| (completar) | (completar) |

## Descripción

Andes Consultores ofrece asesoría profesional a empresas y personas. La plataforma permite a los clientes crear una cuenta, consultar los servicios disponibles y reservar horas, mientras el equipo administrativo gestiona usuarios, contenidos y solicitudes desde un panel protegido.

**Público objetivo:** clientes que contratan asesorías y personal administrativo de la organización.

**Roles**

| Rol | Alcance |
|---|---|
| Visitante | Consulta información pública. |
| Usuario registrado | Accede a su cuenta y administra sus propios datos. |
| Administrador | Accede al panel administrativo y gestiona usuarios y módulos. |

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js 22, Express 4 |
| Base de datos | MongoDB (MongoDB Atlas) con Mongoose |
| Autenticación | JWT (access token) y refresh token rotativo en cookie HttpOnly |
| Contraseñas | bcrypt (bcryptjs, factor de coste 12) |
| Validación | Zod en el servidor, reglas equivalentes en el cliente |
| Pruebas | Jest y Supertest |
| CI/CD | GitHub Actions |
| Hosting | Railway |

## Arquitectura

```
Navegador (React SPA)
        |  HTTPS
        v
Express (API REST + archivos estáticos del frontend)
        |  middleware: helmet, rate limit, validación, autenticación, autorización
        v
Mongoose (modelos y validaciones)
        |
        v
MongoDB Atlas
```

En producción, un único servicio Express expone la API bajo `/api` y sirve el frontend compilado. El navegador y la API comparten origen, por lo que no se requiere CORS.

```
.
├── client/            Frontend React + Vite
│   └── src/
│       ├── api/         Cliente HTTP con renovación de sesión
│       ├── components/  Layout y rutas protegidas
│       ├── context/     Estado de autenticación
│       └── pages/       Vistas
├── server/            Backend Node.js + Express
│   ├── src/
│   │   ├── config/      Variables de entorno y conexión a la base de datos
│   │   ├── controllers/
│   │   ├── middleware/  Autenticación, autorización, validación, límites, errores
│   │   ├── models/      Esquemas Mongoose
│   │   ├── routes/
│   │   ├── services/    Tokens y arranque
│   │   └── validators/  Esquemas Zod
│   └── tests/
├── docs/seguridad/    Evidencias de análisis de seguridad
└── .github/workflows/ Pipeline de integración continua
```

## Modelo de datos

**users**

| Campo | Tipo | Notas |
|---|---|---|
| name | String | 2 a 80 caracteres |
| email | String | Único, en minúsculas |
| passwordHash | String | Hash bcrypt. Excluido de las consultas por defecto |
| role | String | `admin` o `user`. Indexado |
| active | Boolean | Las cuentas inactivas no pueden autenticarse |
| failedAttempts, lockUntil | Number, Date | Bloqueo temporal tras 5 intentos fallidos |
| lastLoginAt | Date | |
| createdAt, updatedAt | Date | Automáticos |

**services**

| Campo | Tipo | Notas |
|---|---|---|
| name | String | 3 a 80 caracteres. Único |
| description | String | 10 a 500 caracteres |
| durationMinutes | Number | Entero entre 15 y 240 |
| price | Number | Entero en CLP, entre 0 y 10.000.000 |
| active | Boolean | Solo los servicios activos son públicos y reservables |

**reservations**

| Campo | Tipo | Notas |
|---|---|---|
| user | ObjectId | Referencia a `users` |
| service | ObjectId | Referencia a `services` |
| startsAt | Date | Inicio de la reserva, en UTC |
| status | String | `pending`, `confirmed` o `cancelled` |
| notes | String | Hasta 300 caracteres |
| blocksSlot | Boolean | `false` cuando la reserva está cancelada. Libera el horario |

Índice único parcial sobre `service` y `startsAt` cuando `blocksSlot` es verdadero: la base de datos impide que dos solicitudes simultáneas reserven el mismo horario.

**sociallinks**

| Campo | Tipo | Notas |
|---|---|---|
| network | String | `instagram`, `facebook`, `linkedin`, `tiktok` o `whatsapp`. Único |
| url | String | Solo https y solo dominios de la red indicada |
| label | String | Texto opcional del enlace |
| order | Number | Orden de aparición, de 0 a 99 |
| active | Boolean | Solo los activos aparecen en el sitio |

**contactmessages**

| Campo | Tipo | Notas |
|---|---|---|
| name, email, phone, subject, message | String | Validados en el servidor. El mensaje admite hasta 1000 caracteres |
| status | String | `new`, `read` o `archived` |
| mail.notification, mail.confirmation | String | Resultado del envío: `sent`, `failed`, `skipped` o `pending` |
| ipHash | String | Huella parcial de la IP para detectar abuso. No se almacena la IP |

**refreshtokens**

| Campo | Tipo | Notas |
|---|---|---|
| user | ObjectId | Referencia a `users`. Indexado |
| tokenHash | String | SHA-256 del token. Único. El token en claro no se guarda |
| expiresAt | Date | Índice TTL: MongoDB elimina el documento al vencer |
| revokedAt | Date | Se completa al usar, rotar o cerrar sesión |

## Instalación y ejecución local

Requisitos: Node.js 20 o superior y una base de datos MongoDB (local o Atlas).

```bash
git clone <url-del-repositorio>
cd andes-consultores
npm install
cp .env.example .env
```

Edita `.env` con tus valores (ver la tabla siguiente) y ejecuta en dos terminales:

```bash
npm run dev:server
npm run dev:client
```

El frontend queda en `http://localhost:5173` y reenvía `/api` al backend en el puerto 4000.

Pruebas y compilación:

```bash
npm test
npm run build
```

Las pruebas necesitan acceso a MongoDB. Por defecto usan `mongodb://127.0.0.1:27017/andes_test`. Se puede cambiar con la variable `MONGODB_URI`. Las pruebas eliminan la base de datos de prueba al terminar, por lo que nunca deben apuntar a la base de datos real.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| NODE_ENV | No | `development`, `test` o `production` |
| PORT | No | Puerto del servidor. Por defecto 4000 |
| MONGODB_URI | Sí | Cadena de conexión con el usuario de aplicación |
| JWT_SECRET | Sí | Clave de firma de los tokens. Mínimo 32 caracteres |
| JWT_ACCESS_TTL | No | Duración del access token. Por defecto `15m` |
| REFRESH_TTL_DAYS | No | Duración del refresh token en días. Por defecto 7 |
| CLIENT_ORIGIN | No | Orígenes permitidos por CORS, separados por coma. Vacío si el frontend se sirve desde el mismo origen |
| ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD | No | Si se definen y la cuenta no existe, se crea el administrador inicial al arrancar |
| MAIL_PROVIDER | No | `none` (por defecto), `brevo` o `resend`. Con `none` los mensajes se guardan pero no se envían correos |
| MAIL_API_KEY | Si hay proveedor | Clave de API del proveedor de correo |
| MAIL_FROM_EMAIL | Si hay proveedor | Remitente. Debe estar verificado en el proveedor |
| MAIL_FROM_NAME | No | Nombre del remitente. Por defecto `Andes Consultores` |
| CONTACT_TO | No | Correo que recibe los mensajes. Por defecto `ADMIN_EMAIL` |
| SEED_DEMO_DATA | No | Con `true`, y solo si las colecciones están vacías, carga servicios y enlaces de ejemplo. Por defecto `false` |

Ningún valor secreto se versiona. El archivo `.env` está excluido en `.gitignore`.

## Reglas de negocio de las reservas

- Atención de lunes a viernes, de 09:00 a 18:00 (zona horaria America/Santiago), en bloques de 30 minutos.
- Solo se reservan horas futuras, con un máximo de 90 días de anticipación.
- Un horario ocupado no puede reservarse de nuevo. Si la reserva se cancela, el horario queda libre.
- Cada usuario puede tener como máximo 5 reservas activas futuras.
- Un usuario solo puede ver y cancelar sus propias reservas. El administrador puede gestionar todas.
- Un servicio con reservas asociadas no se elimina: se desactiva.
- Los usuarios no se eliminan: se desactivan, lo que conserva la trazabilidad y revoca sus sesiones.

## Formulario de contacto y correo

Al enviar el formulario, el mensaje se guarda en MongoDB y se envían dos correos: una notificación a la organización (con `Reply-To` al cliente) y una confirmación al cliente que no repite el contenido del mensaje. Si el envío falla, el mensaje queda guardado y el administrador ve el estado del envío en la bandeja.

El envío usa la API HTTPS del proveedor (Brevo o Resend) y no SMTP. Railway bloquea las conexiones SMTP salientes en los planes Free, Trial y Hobby, por lo que un envío por SMTP no funcionaría al desplegar.

Configuración con Brevo:

1. Crear una cuenta en Brevo y verificar el correo remitente en *Senders*.
2. Crear una clave en *SMTP y API > Claves API*.
3. Definir en Railway: `MAIL_PROVIDER=brevo`, `MAIL_API_KEY`, `MAIL_FROM_EMAIL` (el remitente verificado) y `CONTACT_TO`.

Protecciones antispam del formulario: campo trampa invisible para personas, tiempo mínimo de llenado de 2 segundos, máximo de 5 envíos por hora por IP, máximo de 3 mensajes por correo cada 24 horas, validación estricta y rechazo de saltos de línea en nombre y asunto.

## API

Las rutas privadas esperan el encabezado `Authorization: Bearer <accessToken>`.

**Públicas**

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/health | Estado del servicio y de la base de datos |
| GET | /api/services | Servicios activos |
| GET | /api/services/:id/availability?date=AAAA-MM-DD | Horarios del día y su disponibilidad |
| GET | /api/social-links | Enlaces de redes sociales activos |
| POST | /api/auth/register | Crea una cuenta con rol `user` |
| POST | /api/auth/login | Inicia sesión y entrega un access token |
| POST | /api/auth/refresh | Rota el refresh token (cookie) y entrega un nuevo access token |
| POST | /api/auth/logout | Revoca el refresh token |
| POST | /api/contact | Envía un mensaje de contacto |

**Usuario autenticado**

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/auth/me | Perfil de la cuenta |
| POST | /api/reservations | Crea una reserva |
| GET | /api/reservations/mine | Reservas propias |
| PATCH | /api/reservations/:id/cancel | Cancela una reserva propia |

**Administrador**

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/admin/summary | Métricas generales |
| GET, POST | /api/admin/services | Lista y crea servicios |
| PATCH, DELETE | /api/admin/services/:id | Edita y elimina un servicio |
| GET | /api/admin/reservations | Lista paginada, con filtro por estado |
| PATCH, DELETE | /api/admin/reservations/:id | Cambia el estado o elimina una reserva |
| GET, POST | /api/admin/users | Lista paginada con búsqueda y filtro por perfil. Crea usuarios con rol |
| PATCH | /api/admin/users/:id | Cambia el rol o el estado de un usuario |
| GET | /api/admin/contact-messages | Lista paginada, con filtro por estado |
| PATCH, DELETE | /api/admin/contact-messages/:id | Cambia el estado o elimina un mensaje |
| GET, POST | /api/admin/social-links | Lista y crea enlaces |
| PATCH, DELETE | /api/admin/social-links/:id | Edita y elimina un enlace |

**Códigos de error:** `400` datos inválidos; `401` token ausente, inválido o expirado; `403` rol insuficiente o recurso ajeno; `404` recurso inexistente; `409` conflicto (correo duplicado, horario ocupado, servicio con reservas); `423` cuenta bloqueada temporalmente; `429` límite de solicitudes superado.

## Seguridad implementada

- Contraseñas con bcrypt, factor de coste 12. Nunca se almacenan ni se devuelven en texto plano. El hash se excluye de todas las consultas por defecto.
- Política de contraseña: 10 a 72 caracteres, con al menos una letra y un número.
- Access token JWT firmado con HS256, 15 minutos de vigencia, con `sub` y `role` como único contenido. Se verifican algoritmo, emisor y expiración.
- Refresh token aleatorio de 384 bits, almacenado como hash SHA-256, de un solo uso (rotación) y entregado en cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción y limitada a `/api/auth`.
- El access token se mantiene solo en memoria del navegador.
- Autorización por rol en el servidor. El usuario y su estado se consultan en cada solicitud, por lo que desactivar una cuenta o cambiar su rol surte efecto inmediato.
- Mensaje genérico ante credenciales incorrectas y comparación de contraseña con costo equivalente cuando el correo no existe.
- Bloqueo temporal de la cuenta tras 5 intentos fallidos.
- Límite de solicitudes general y más estricto en rutas de autenticación.
- Validación de entradas con esquemas estrictos que rechazan campos no declarados, y bloqueo de claves con `$` o `.` contra inyección NoSQL. Mongoose con `sanitizeFilter` activado.
- Cabeceras de seguridad con Helmet y política de contenido restrictiva (`script-src 'self'`).
- Errores controlados. En producción no se exponen trazas ni detalles internos.
- Cuerpo de las solicitudes limitado a 10 kB.
- Control de propiedad: cada reserva solo puede consultarse o cancelarse por quien la creó o por un administrador. La respuesta ante un recurso ajeno es 403 sin revelar datos.
- Integridad de reservas garantizada en la base de datos mediante un índice único parcial, de modo que las solicitudes concurrentes no generan duplicados.
- Reglas de horario validadas en el servidor, sin depender del navegador.
- Enlaces de redes sociales restringidos a https y al dominio de la red declarada, sin credenciales embebidas. Se abren con `rel="noopener noreferrer"`.
- Un administrador no puede modificar su propio rol ni estado. Al cambiar el rol o desactivar una cuenta se revocan sus refresh tokens.
- Búsquedas de usuarios con caracteres especiales escapados, para evitar expresiones regulares inyectadas.
- Formulario de contacto con campo trampa, tiempo mínimo de llenado y límites por IP y por correo.
- Los correos escapan el HTML de los datos ingresados y la confirmación al cliente no incluye el texto del mensaje, para que el formulario no sirva como vía de envío de contenido a terceros.
- La clave del proveedor de correo vive solo en variables de entorno y los errores de envío no la registran.

## Integración continua

El archivo `.github/workflows/ci.yml` se ejecuta en cada `push` y `pull request` hacia `main` y `develop`:

| Trabajo | Pasos | Condición de falla |
|---|---|---|
| Instalar, probar y compilar | `npm ci`, `npm test` con un servicio MongoDB, `npm run build` | Cualquier prueba fallida o error de compilación |
| Auditoría de dependencias | `npm ci`, `npm audit --audit-level=high` | Una dependencia con vulnerabilidad de severidad alta o crítica |

Evidencia del análisis de dependencias: `docs/seguridad/npm-audit-inicial.txt` y `docs/seguridad/npm-audit-posterior.txt`.

## Despliegue

El servicio se despliega en Railway desde la rama `main` del repositorio y se conecta a MongoDB Atlas.

1. Crear el proyecto en Railway desde el repositorio de GitHub.
2. Definir las variables de entorno de la tabla anterior en la pestaña Variables del servicio. En producción: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` y las variables `ADMIN_*`.
3. Generar el dominio público en Settings > Networking. Railway entrega HTTPS.
4. Railway ejecuta `npm install`, `npm run build` y `npm start`, definidos en el `package.json` de la raíz.
5. Verificar `https://<dominio>/api/health`.

En MongoDB Atlas debe existir un usuario de base de datos exclusivo para la aplicación, con el rol `readWrite` solo sobre la base `andes`, y el acceso de red debe permitir las conexiones desde Railway.
