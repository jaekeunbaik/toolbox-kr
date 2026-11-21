// Routes: POST /api/contact (visitor inquiry -> GitHub issue), POST /discord (approve/reject buttons).
// Everything else is served from public/ by the assets layer before this worker runs.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const hex = s => Uint8Array.from(s.match(/../g).map(b => parseInt(b, 16)));

function github(env, path, method, body) {
  return fetch(`https://api.github.com/repos/${env.REPO}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'toolbox-kr-worker',
    },
    body: JSON.stringify(body),
  });
}

async function contact(req, env) {
  let d;
  try { d = await req.json(); } catch { return json({ error: '잘못된 요청입니다.' }, 400); }
  if (d.website) return json({ ok: true }); // honeypot: bots fill hidden field, pretend success
  const msg = typeof d.message === 'string' ? d.message.trim() : '';
  if (msg.length < 5 || msg.length > 2000) return json({ error: '문의 내용은 5~2000자로 적어주세요.' }, 400);
  const r = await github(env, '/issues', 'POST', {
    title: `[문의] ${msg.slice(0, 40).replace(/\s+/g, ' ')}`,
    body: msg,
  });
  return r.ok ? json({ ok: true }) : json({ error: '접수에 실패했어요. 잠시 후 다시 시도해주세요.' }, 502);
}

async function verify(req, env, body) {
  const sig = req.headers.get('x-signature-ed25519');
  const ts = req.headers.get('x-signature-timestamp');
  if (!sig || !ts) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hex(sig), new TextEncoder().encode(ts + body));
  } catch { return false; }
}

async function discord(req, env) {
  const body = await req.text();
  if (!(await verify(req, env, body))) return new Response('bad signature', { status: 401 });
  const i = JSON.parse(body);
  if (i.type === 1) return json({ type: 1 }); // Discord endpoint PING
  if (i.type !== 3) return json({ error: 'unsupported' }, 400);

  const uid = i.member?.user?.id ?? i.user?.id;
  if (uid !== env.OWNER_DISCORD_ID) return json({ type: 4, data: { content: '권한이 없습니다.', flags: 64 } });

  const [action, pr] = String(i.data?.custom_id).split(':');
  if (!/^\d+$/.test(pr) || !['approve', 'reject'].includes(action)) return json({ error: 'bad custom_id' }, 400);

  const r = action === 'approve'
    ? await github(env, `/pulls/${pr}/merge`, 'PUT', { merge_method: 'squash' })
    : await github(env, `/pulls/${pr}`, 'PATCH', { state: 'closed' });
  const result = !r.ok ? `⚠️ 처리 실패 (GitHub ${r.status})` : action === 'approve' ? '✅ 승인됨 — 배포가 시작됩니다' : '❌ 반려됨';
  // type 7 = edit the original message; drop buttons once handled so they can't be pressed twice
  return json({ type: 7, data: { content: `${i.message.content}\n\n**${result}**`, components: r.ok ? [] : i.message.components } });
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/api/contact') return contact(req, env);
    if (req.method === 'POST' && pathname === '/discord') return discord(req, env);
    if (req.method === 'GET' && env.ASSETS) { // friendly page for unknown addresses, still a real 404 for search engines
      const page = await env.ASSETS.fetch(new URL('/404', req.url));
      return new Response(page.body, { status: 404, headers: page.headers });
    }
    return new Response('Not found', { status: 404 });
  },
};
