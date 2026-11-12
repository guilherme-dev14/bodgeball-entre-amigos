const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../BodgeBall-entre-amigos/servidor.cjs');

let root, server, base;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'bodgeball-test-'));
  await fs.mkdir(path.join(root, 'jogo/assets'), { recursive: true });
  await fs.writeFile(path.join(root, 'abrir.html'), '<h1>Entrar na sala</h1>');
  await fs.writeFile(path.join(root, 'jogo/index.html'), '<canvas></canvas>');
  await fs.writeFile(path.join(root, 'jogo/assets/sample.js'), '0123456789');
  await fs.writeFile(path.join(root, 'privado.txt'), 'private');
  server = createServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (root) await fs.rm(root, { recursive: true });
});

test('entrega o iniciador e o HTML original', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Entrar na sala/);
  const game = await fetch(base + '/jogo/index.html');
  assert.equal(game.status, 200);
  assert.match(await game.text(), /canvas/);
});

test('HEAD e MIME permitem carregar scripts sem executar respostas de texto', async () => {
  const response = await fetch(base + '/jogo/assets/sample.js', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal((await response.arrayBuffer()).byteLength, 0);
});

test('intervalos de bytes e sufixos preservam o conteúdo', async () => {
  for (const [range, expected, contentRange] of [
    ['bytes=2-5', '2345', 'bytes 2-5/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=8-', '89', 'bytes 8-9/10'],
  ]) {
    const response = await fetch(base + '/jogo/assets/sample.js', { headers: { range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), contentRange);
    assert.equal(await response.text(), expected);
  }
});

test('rejeita intervalos inválidos', async () => {
  for (const range of ['bytes=100-', 'bytes=7-2', 'bytes=-', 'bytes=0-1,3-4']) {
    const response = await fetch(base + '/jogo/assets/sample.js', { headers: { range } });
    assert.equal(response.status, 416, range);
    await response.arrayBuffer();
  }
});

test('bloqueia arquivos fora do jogo e tentativas de sair da pasta', async () => {
  for (const url of ['/privado.txt', '/runtime/node.exe', '/jogo/%2e%2e%2fprivado.txt']) {
    const response = await fetch(base + url);
    assert.ok([403, 404].includes(response.status), url);
    assert.notEqual(await response.text(), 'private');
  }
});

test('rejeita escrita e caminhos inválidos sem derrubar o servidor', async () => {
  const post = await fetch(base + '/', { method: 'POST', body: 'x' });
  assert.equal(post.status, 405);
  await post.arrayBuffer();
  const invalid = await fetch(base + '/jogo/%ZZ');
  assert.equal(invalid.status, 400);
  await invalid.arrayBuffer();
  const health = await fetch(base + '/status');
  assert.equal((await health.json()).app, 'bodgeball-local');
});
