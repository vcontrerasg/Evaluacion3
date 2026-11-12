const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const routes = require('./routes');
const noSqlGuard = require('./middleware/noSqlGuard');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: env.isProd ? [] : null
        }
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false
    })
  );

  if (env.allowedOrigins.length > 0) {
    app.use(cors({ origin: env.allowedOrigins, credentials: true }));
  }

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
  });
  app.use('/api', apiLimiter, noSqlGuard, routes);
  app.use('/api', notFound);

  const distPath = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      app.use(
        express.static(distPath, {
          index: false,
          redirect: false,
          maxAge: env.isProd ? '1h' : 0,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            }
          }
        })
      );
      app.get(/^\/(?!api\/).*/, (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.use(errorHandler);
    return app;
  }

module.exports = createApp;
