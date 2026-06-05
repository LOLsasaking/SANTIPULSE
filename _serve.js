// Minimal static server mimicking Vercel clean-URL routing for local verification.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 4599;
const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.mp4':'video/mp4',
  '.webm':'video/webm', '.webp':'image/webp', '.ico':'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('404'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end('500');
  }
});
server.listen(PORT, () => console.log('SERVING http://localhost:' + PORT));
