/* 말문 영어회화 — offline cache */
const V='malmun-v6';
const FONTS='malmun-fonts';
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];

/* Safari refuses redirected responses for page loads, so store a clean copy. */
async function clean(res){
  if(!res||!res.redirected)return res;
  const body=await res.blob();
  return new Response(body,{status:res.status,statusText:res.statusText,headers:res.headers});
}
async function precache(){
  const c=await caches.open(V);
  await Promise.all(SHELL.map(async u=>{
    const res=await fetch(new Request(u,{cache:'reload'}));
    if(res.ok)await c.put(u,await clean(res));
  }));
}
self.addEventListener('install',e=>{e.waitUntil(precache().then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

async function page(req){
  const c=await caches.open(V);
  const cached=(await c.match('index.html'))||(await c.match('./'));
  const net=fetch(req).then(async res=>{if(res.ok){await c.put('index.html',await clean(res.clone()))}return res}).catch(()=>null);
  if(cached){net.catch(()=>{});return cached}       // open instantly from the phone, refresh in background
  const res=await net;
  return res?clean(res):new Response('<meta charset="utf-8"><p style="font-family:sans-serif;padding:40px;text-align:center">인터넷에 연결된 상태로 한 번 열어 주세요.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(r.mode==='navigate'){e.respondWith(page(r));return}
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(async res=>{if(res.ok){const c=await caches.open(V);c.put(r,await clean(res.clone()))}return res})));
    return;
  }
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open(FONTS).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{c.put(r,res.clone());return res}))).catch(()=>new Response('',{status:504})));
  }
});
