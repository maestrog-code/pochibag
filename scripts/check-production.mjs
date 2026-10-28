#!/usr/bin/env node
import process from 'node:process';

const args = process.argv.slice(2);
const urlArgIndex = args.indexOf('--url');
const productionUrl = (urlArgIndex >= 0 ? args[urlArgIndex + 1] : process.env.PRODUCTION_URL || '').replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

if (!productionUrl) {
  console.error('Usage: PRODUCTION_URL=https://your-domain.example npm run check:production');
  console.error('   or: npm run check:production -- --url https://your-domain.example');
  process.exit(2);
}

function withTimeout(signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function request(path, options = {}) {
  const timer = withTimeout(options.signal);
  try {
    const response = await fetch(`${productionUrl}${path}`, { ...options, signal: timer.signal, redirect: 'manual' });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text };
  } finally { timer.clear(); }
}

const checks = [
  { name: 'homepage', path: '/', expected: [200] },
  { name: 'order success page', path: '/order-success.html', expected: [200] },
  { name: 'public config endpoint', path: '/api/public-config', expected: [200], json: true },
  { name: 'order status endpoint', path: '/api/order-status?order=SMOKE_NONEXISTENT', expected: [404] },
  { name: 'order submit method guard', path: '/api/submit-order', method: 'GET', expected: [405] },
  { name: 'Razorpay webhook method guard', path: '/api/razorpay-webhook', method: 'GET', expected: [405] }
];

let failures = 0;
for (const check of checks) {
  try {
    const result = await request(check.path, { method: check.method || 'GET', headers: { Accept: 'application/json,text/html' } });
    const passedStatus = check.expected.includes(result.status);
    const passedJson = !check.json || (() => { try { JSON.parse(result.text); return true; } catch { return false; } })();
    if (passedStatus && passedJson) console.log(`PASS ${check.name}: ${result.status}`);
    else { failures += 1; console.error(`FAIL ${check.name}: got ${result.status}, expected ${check.expected.join('/')}`); }
  } catch (error) { failures += 1; console.error(`FAIL ${check.name}: ${error.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : error.message}`); }
}

if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
  try {
    const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(process.env.VERCEL_PROJECT_ID)}&limit=1`, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } });
    const data = await response.json();
    if (!response.ok || !data.deployments?.[0]) throw new Error(`Vercel API returned ${response.status}`);
    const deployment = data.deployments[0];
    console.log(`PASS latest Vercel deployment: ${deployment.state || 'unknown'} ${deployment.url || ''}`);
    if (deployment.state !== 'READY') failures += 1;
  } catch (error) { failures += 1; console.error(`FAIL Vercel deployment status: ${error.message}`); }
} else {
  console.log('INFO Vercel deployment metadata skipped; set VERCEL_TOKEN and VERCEL_PROJECT_ID to enable it.');
}

if (failures) { console.error(`Production check failed: ${failures} check(s).`); process.exit(1); }
console.log(`Production check passed for ${productionUrl}`);
