/* BRO Handoff: opens official provider sites; no cookie/session scraping, iframe, or API calls. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BroHandoff=factory()})(typeof self!=='undefined'?self:this,function(){
'use strict';
const SITES={
 chatgpt:{label:'ChatGPT',url:'https://chatgpt.com/',prefill:true},
 gemini:{label:'Gemini',url:'https://gemini.google.com/app',prefill:false},
 deepseek:{label:'DeepSeek',url:'https://chat.deepseek.com/',prefill:false},
 claude:{label:'Claude',url:'https://claude.ai/new',prefill:false}
};
const MAX_URL_PROMPT=1500;
function clip(s,n){s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s}
function buildPrompt(text,history,opts){
 opts=opts||{};text=String(text||'').trim();if(!opts.withContext)return text;
 const h=(history||[]).filter(m=>m&&m.content&&!m.err&&m.role!=='system').slice(-(opts.turns||4));
 if(!h.length)return text;
 const ctx=h.map(m=>(m.role==='user'?'Pengguna: ':'Asisten: ')+clip(m.content,opts.perTurn||500)).join('\n');
 return 'Konteks percakapan sebelumnya (ringkas):\n'+ctx+'\n\nPesan baru dari pengguna:\n'+text;
}
function target(provider,prompt){const s=SITES[provider];if(!s)return null;const enc=encodeURIComponent(String(prompt||''));if(provider==='chatgpt'&&prompt&&enc.length<=MAX_URL_PROMPT)return {url:s.url+'?q='+enc,prefilled:true,site:s};return {url:s.url,prefilled:false,site:s}}
return {SITES,buildPrompt,target,MAX_URL_PROMPT};
});