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

Ningún valor secreto se versiona. El archivo `.env` está excluido en `.gitignore`.

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | /api/health | Público | Estado del servicio y de la base de datos |
| POST | /api/auth/register | Público | Crea una cuenta con rol `user` |
| POST | /api/auth/login | Público | Inicia sesión y entrega un access token |
| POST | /api/auth/refresh | Cookie | Rota el refresh token y entrega un nuevo access token |
| POST | /api/auth/logout | Cookie | Revoca el refresh token |
| GET | /api/auth/me | Usuario | Perfil de la cuenta autenticada |
| GET | /api/admin/summary | Administrador | Resumen de usuarios |

Las rutas privadas esperan el encabezado `Authorization: Bearer <accessToken>`.

Respuestas de error: `401` token ausente, inválido o expirado; `403` rol insuficiente; `400` datos inválidos; `409` correo duplicado; `423` cuenta bloqueada temporalmente; `429` límite de solicitudes superado.

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
