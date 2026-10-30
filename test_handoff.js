const assert = require('node:assert/strict');
const H = require('./handoff.js');
const fs = require('node:fs');
const frontend = fs.readFileSync(require.resolve('./index.html'), 'utf8');

assert.deepEqual(Object.keys(H.SITES).sort(), ['chatgpt','claude','deepseek','gemini']);
assert.equal(H.buildPrompt('  halo  ', [], {withContext:false}), 'halo');
const p = H.buildPrompt('pertanyaan baru', [
  {role:'user',content:'sebelumnya'},
  {role:'assistant',content:'jawaban sebelumnya'}
], {withContext:true});
assert.match(p, /Pengguna: sebelumnya/);
assert.match(p, /Asisten: jawaban sebelumnya/);
assert.match(p, /Pesan baru dari pengguna:\npertanyaan baru/);
assert.equal(H.target('unknown','x'), null);
assert.equal(H.target('deepseek','tes').url, 'https://chat.deepseek.com/');
assert.equal(H.target('gemini','tes').url, 'https://gemini.google.com/app');
assert.equal(H.target('claude','tes').url, 'https://claude.ai/new');
assert.match(H.target('chatgpt','tes').url, /^https:\/\/chatgpt\.com\/\?q=/);
const long = H.target('chatgpt', 'x'.repeat(3000));
assert.equal(long.prefilled, false);
assert.equal(long.url, 'https://chatgpt.com/');
// Frontend security regression checks: bearer token is session-scoped, not persisted in localStorage.
assert.match(frontend, /sessionStorage\\.setItem\\('bro_ai_access_token_v1'/);
assert.match(frontend, /sessionStorage\\.removeItem\\('bro_ai_access_token_v1'/);
assert.match(frontend, /const t=tok===undefined\\?currentToken\\(\\):tok/);
assert.doesNotMatch(frontend, /settings\\.token\\s*=/);
assert.match(frontend, /function esc\\(s\\)\\{return String\\(s\\)\\.replace\\(\\/\\[&<>/);
assert.match(frontend, /body\\.innerHTML=role==='user'\\?esc\\(content\\):md\\(content\\)/);
assert.match(frontend, /function md\\(s\\)\\{let t=esc\\(s\\)/);
console.log('12 handoff tests + 7 frontend security checks passed');
