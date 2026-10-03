import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const port = Number(process.env.PORT ?? 3000);
const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};
try {
  await stat(resolve(root, 'index.html'));
} catch {
  console.error('Run npm run build first.');
  process.exit(1);
}
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) {
        const index = resolve(file, 'index.html');
        try {
          await stat(index);
          file = index;
        } catch {
          // Exported routes can also have a directory containing RSC payloads.
          file += '.html';
        }
      }
    } catch {
      // Next's static export uses learn.html for the /learn route.
      if (extname(file)) throw new Error('Not found');
      file += '.html';
      await stat(file);
    }
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(contents);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`ostra: http://127.0.0.1:${port}`));
