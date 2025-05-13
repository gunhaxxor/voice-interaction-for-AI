import { defineConfig } from "vite";
import path from "path";
import fs from 'fs';

const sharedModelPath = path.resolve(__dirname, '../models');

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
  },
  plugins: [
    {
      // This plugin was needed because vosklet cant handle streamed responses of the requested models.
      // vite streams assets by default, and this is unfortunately not configurable.
      // While at it, we also points requests for models to shared models path
      name: 'buffered-model-serving',
      configureServer(server) {
        server.middlewares.use('/models', (req, res, next) => {
          // console.log('req.url', req.url);
          const relativePath = req.url || '';

          if (!relativePath.endsWith('.tar.gz')) return next();

          const filePath = path.join(sharedModelPath, relativePath);
          console.log(filePath);

          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.statusCode = 404;
              res.end('Not found');
              return;
            }
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Length', data.length.toString());
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.end(data);
          });
        });
      },
    },
  ]
  // publicDir: '../models',
});