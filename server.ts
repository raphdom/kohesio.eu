
import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import * as express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {  AppServerModule as bootstrap } from './src/main.server';
import { REQUEST, RESPONSE } from './src/express.tokens';
import { LOCALE_ID } from '@angular/core';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  // const lang = 'en';

  // @ts-ignore
  // const dir = process.env.DIST_DIR || join(process.cwd(), 'dist/kohesio-frontend/browser');
  // const distFolder = join(process.cwd(), 'dist/kohesio-frontend/browser');
  // const distFolder = join(dir ? dir : process.cwd(), `${lang}`);
  const distFolder = join(process.cwd(), 'dist/kohesio-frontend/browser');

  // const indexHtml = existsSync(join(distFolder, 'index.original.html'))
  //   ? join(distFolder, 'index.original.html')
  //   : join(distFolder, 'index.html');
  // const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    const lang = req.headers['accept-language'] ? req.headers['accept-language'].split(',')[0] : 'en';
    const indexHtmlPath = join(distFolder, `${lang}/index.html`);
    const indexHtml = existsSync(indexHtmlPath)
      ? indexHtmlPath
      : join(distFolder, 'en/index.html');
    console.log('lang',lang);
    console.log('baseUrl',baseUrl);
    console.log('indexHtml',indexHtml);
    // console.log('REQUEST', REQUEST);
    // console.log('RESPONSE', RESPONSE);
    // console.log('LOCALE_ID', LOCALE_ID);

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: distFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: RESPONSE, useValue: res },
          { provide: REQUEST, useValue: req },
          { provide: LOCALE_ID, useValue: lang }
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
