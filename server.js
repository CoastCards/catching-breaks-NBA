const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;

// In-memory state
let assignments = [];
let resetFlag = false;

function serveFile(res, filename, contentType) {
  const filePath = path.join(__dirname, filename);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found: ' + filename);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve overlay (OBS loads this)
  if (req.method === 'GET' && req.url === '/') {
    serveFile(res, 'overlay.html', 'text/html');
    return;
  }

  // Serve control panel (you open this in your browser)
  if (req.method === 'GET' && req.url === '/control') {
    serveFile(res, 'control.html', 'text/html');
    return;
  }

  // GET /state — overlay and control panel poll this
  if (req.method === 'GET' && req.url === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ assignments, resetFlag }));
    return;
  }

  // POST /assign — control panel posts { team, user }
  if (req.method === 'POST' && req.url === '/assign') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { team, user } = JSON.parse(body);
        if (team && user) {
          if (!assignments.find(a => a.team.toLowerCase() === team.toLowerCase())) {
            assignments.push({ team, user });
            console.log(`✓ Assigned: ${team} → ${user}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, assignments }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Already assigned' }));
          }
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Missing team or user' }));
        }
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // POST /reset — clears all assignments
  if (req.method === 'POST' && req.url === '/reset') {
    assignments = [];
    resetFlag = true;
    console.log('↺ Board reset');
    setTimeout(() => { resetFlag = false; }, 3000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     Catching Breaks — Overlay Server     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  OBS Browser Source URL:                 ║`);
  console.log(`║    http://localhost:${PORT}               ║`);
  console.log(`║                                          ║`);
  console.log(`║  Your Control Panel (open in browser):   ║`);
  console.log(`║    http://localhost:${PORT}/control       ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
