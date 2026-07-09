import { spawn } from 'node:child_process';

const projects = [
  {
    name: 'AI Assistant Platform',
    cwd: 'github-projects/ai-assistant-platform',
    port: 5101,
    endpoint: '/api/message',
    body: {
      business: 'Santiago Portfolio Demo',
      message: 'Can I get a quote for a website?',
      knowledge: 'Websites, AI assistants, automation, and business services.',
    },
    expect: (json) => json.ok === true && json.run?.intent === 'quote_request',
  },
  {
    name: 'Automation Ops Platform',
    cwd: 'github-projects/automation-ops-platform',
    port: 5102,
    endpoint: '/api/run',
    body: { payload: 'Urgent customer needs appointment today' },
    expect: (json) => json.ok === true && json.run?.priority === 'high',
  },
  {
    name: 'Brand Identity AI Studio',
    cwd: 'github-projects/brand-identity-ai-studio',
    port: 5103,
    endpoint: '/api/generate-brand',
    body: {
      name: 'Santi Pulse',
      sector: 'digital services',
      direction: 'premium technical blue identity',
      color: '#124BA7',
    },
    expect: (json) => json.ok === true && json.kit?.palette?.length >= 4,
  },
  {
    name: 'Electrical Planning Platform',
    cwd: 'github-projects/electrical-planning-platform',
    port: 5104,
    endpoint: '/api/plan',
    body: { rooms: 5, area: 90, loads: 'kitchen, ev charger, solar reserve' },
    expect: (json) => json.ok === true && json.circuits?.length >= 5,
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(port, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error(`Server on port ${port} did not become ready`);
}

async function runProject(project) {
  const child = spawn('node', ['server.js'], {
    cwd: project.cwd,
    env: { ...process.env, PORT: String(project.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });

  try {
    await waitForServer(project.port);
    const response = await fetch(`http://127.0.0.1:${project.port}${project.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project.body),
    });
    const json = await response.json();
    if (!response.ok || !project.expect(json)) {
      throw new Error(`${project.name} failed smoke assertion: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return { name: project.name, ok: true, status: response.status };
  } finally {
    child.kill('SIGTERM');
    await wait(100);
    if (!child.killed) child.kill('SIGKILL');
  }
}

const results = [];
for (const project of projects) {
  results.push(await runProject(project));
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
