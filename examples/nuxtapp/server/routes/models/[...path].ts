import { readFile, stat } from 'fs/promises'
import { defineEventHandler, serveStatic } from 'h3'
import { relative, resolve } from 'path'

const modelsDir = resolve(process.cwd(), '../models')
// console.log('modelsDir:', modelsDir);
function secureResolve(base: string, path: string) {
  const cleanPath = path.replace(/^\/+/, ''); // remove leading slashes
  const fullPath = resolve(base, cleanPath);
  const relPath = relative(base, fullPath);
  
  if(relPath.startsWith('..') || relPath.includes('..')) {
    console.error('Someone is trying to escape the models directory!');
    throw new Error('Invalid path');
  }
  
  return fullPath;
}

export default defineEventHandler((event) => {
    return serveStatic(event, {
      indexNames: [],
      fallthrough: false,
      getMeta: async (id) => {
        
        if(!id.startsWith('/models/')) return; // should never happen, right?
        

        const filePath = secureResolve(modelsDir, id.slice('/models/'.length));

        const stats = await stat(filePath).catch(() => {});

        if (!stats || !stats.isFile()) {
          return;
        }

        return {
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      },
      getContents: (id) => {
        //shouldnt happen, right?
        if(!id.startsWith('/models/')) return; // should never happen, right?

        const filePath = secureResolve(modelsDir, id.slice('/models/'.length));
        return readFile(filePath);
      },
    })
})
