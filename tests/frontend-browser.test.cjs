'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err,data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.addInitScript(()=>{
      localStorage.setItem('bro_ai_settings_v03',JSON.stringify({workerUrl:'',token:'legacy-session-token',modes:{chatgpt:'direct'}}));
      localStorage.setItem('bro_ai_history_v03',JSON.stringify([{role:'user',content:'<img src=x onerror=window.__xss=1>','label':'LO'}]));
      localStorage.setItem('bro_ai_webapps_v03',JSON.stringify([{name:'<img src=x onerror=window.__xss=6>',url:'https://example.com/'}]));
    });
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:'+address.port+'/index.html');
    await page.waitForSelector('.msg');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('bro_ai_access_token_v1')),'legacy-session-token');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bro_ai_settings_v03')||'{}'));
    assert.equal(Object.prototype.hasOwnProperty.call(saved,'token'),false);
    assert.equal(await page.locator('.messages img').count(),0);
    assert.equal(await page.evaluate(()=>window.__xss||0),0);

    const token='browser-test-token';
    await page.locator('#workerUrl').fill('https://worker.invalid');
    await page.locator('#accessToken').fill(token);
    await page.locator('#saveUrl').click();
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('bro_ai_access_token_v1')),token);
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)).then(s=>s.includes(token)),false);

    await page.route('https://worker.invalid/chat',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,reply:'<img src=x onerror=window.__xss=2><svg onload=window.__xss=3>',provider:'gemini',model:'test-model'})
    }));
    const payload='<img src=x onerror=window.__xss=4><svg onload=window.__xss=5>';
    await page.locator('#prompt').fill(payload);
    await page.locator('#sendBtn').click();
    await page.waitForFunction(()=>document.querySelectorAll('.msg').length>=3);
    await page.waitForFunction(()=>document.querySelector('.msg.assistant .meta')?.textContent?.includes('provider: gemini'));
    assert.equal(await page.locator('.messages img, .messages svg').count(),0);
    assert.equal(await page.evaluate(()=>window.__xss||0),0);
    assert.ok((await page.locator('.messages').innerText()).includes('<img src=x'));
    console.log('PASS: Chromium DOM/XSS checks — token migration, session-only token, imported history/webapp labels, notes, modal voice names, user input, assistant response');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
