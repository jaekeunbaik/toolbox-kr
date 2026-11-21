// node test/worker.test.mjs — checks signature check, owner check, approve/reject, contact validation.
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const toHex = b => Buffer.from(b).toString('hex');
const env = { REPO: 'o/r', GITHUB_TOKEN: 't', OWNER_DISCORD_ID: '111',
  DISCORD_PUBLIC_KEY: toHex(await crypto.subtle.exportKey('raw', publicKey)) };

const calls = [];
globalThis.fetch = async (url, init) => { calls.push([init.method, url, JSON.parse(init.body)]); return new Response('{}', { status: 200 }); };

async function discord(payload, sign = true) {
  const body = JSON.stringify(payload), ts = '123';
  const sig = sign ? toHex(await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(ts + body))) : '00'.repeat(64);
  const r = await worker.fetch(new Request('https://x/discord', { method: 'POST', body,
    headers: { 'x-signature-ed25519': sig, 'x-signature-timestamp': ts } }), env);
  return [r.status, r.status === 200 ? await r.json() : null];
}
const press = (uid, id) => ({ type: 3, member: { user: { id: uid } }, data: { custom_id: id }, message: { content: 'm', components: [1] } });

assert.equal((await discord({ type: 1 }, false))[0], 401);
assert.deepEqual((await discord({ type: 1 }))[1], { type: 1 });
assert.equal((await discord(press('999', 'approve:5')))[1].data.flags, 64);
assert.equal(calls.length, 0, 'stranger must not reach GitHub');

let [, res] = await discord(press('111', 'approve:5'));
assert.deepEqual(calls.pop().slice(0, 2), ['PUT', 'https://api.github.com/repos/o/r/pulls/5/merge']);
assert.equal(res.type, 7); assert.deepEqual(res.data.components, []);
await discord(press('111', 'reject:6'));
assert.deepEqual(calls.pop(), ['PATCH', 'https://api.github.com/repos/o/r/pulls/6', { state: 'closed' }]);
assert.equal((await discord(press('111', 'approve:../x')))[0], 400);

const contact = m => worker.fetch(new Request('https://x/api/contact', { method: 'POST', body: JSON.stringify(m) }), env);
assert.equal((await contact({ message: 'hi' })).status, 400);
assert.equal((await contact({ message: '대출 계산기 추가해주세요', website: 'spam' })).status, 200);
assert.equal(calls.length, 0, 'honeypot must not create issue');
assert.equal((await contact({ message: '대출 계산기 추가해주세요' })).status, 200);
assert.equal(calls.pop()[2].title, '[문의] 대출 계산기 추가해주세요');
console.log('all worker tests passed');
