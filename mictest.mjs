import http from 'http'; import fs from 'fs'; import path from 'path';
import puppeteer from 'puppeteer';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURI(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'text/plain'});fs.createReadStream(f).pipe(r);}).listen(8096);

const b=await puppeteer.launch({args:[
  '--no-sandbox','--autoplay-policy=no-user-gesture-required',
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--use-file-for-fake-audio-capture=/tmp/notes.wav%noloop'.replace('%noloop',''),
]});
const pg=await b.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await pg.setViewport({width:1194,height:800,deviceScaleFactor:1,isMobile:true,hasTouch:true});
const ctx=b.defaultBrowserContext();
await ctx.overridePermissions('http://localhost:8096',['microphone']);
await pg.evaluateOnNewDocument(()=>{localStorage.setItem('pq:speech','off');});
await pg.goto('http://localhost:8096/index.html',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,600));
await pg.mouse.click(600,400);
await new Promise(r=>setTimeout(r,400));

// turn the mic on
const clicked = await pg.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/Use my piano/i.test(x.textContent));
  if(!b)return false; b.click(); return true;
});
console.log('mic button found & clicked:', clicked);
await new Promise(r=>setTimeout(r,900));
const state = await pg.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/Listening|Use my piano|Mic/i.test(x.textContent));
  return b?b.textContent.trim():null;
});
console.log('mic state after click:', JSON.stringify(state));

// open Free Play so the "heard" readout is visible, and sample it over time
await pg.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Open the piano/i.test(x.textContent));b&&b.click();});
await new Promise(r=>setTimeout(r,400));

const seen=new Set(); const samples=[];
for(let i=0;i<70;i++){
  const h=await pg.evaluate(()=>{
    const els=[...document.querySelectorAll('span')];
    const lab=els.find(e=>/listening/i.test(e.textContent)&&e.style.color);
    if(!lab)return null;
    const row=lab.parentElement;
    const val=row.querySelectorAll('span')[1];
    return val?val.textContent.trim():null;
  });
  if(h&&h!=='\u2014'){ seen.add(h); if(samples[samples.length-1]!==h) samples.push(h); }
  await new Promise(r=>setTimeout(r,60));
}
console.log('notes heard (in order):', samples.join(' -> ')||'(none)');
console.log('unique notes detected :', [...seen].join(', ')||'(none)');
const expect=['C4','E4','G4','C5'];
const hit=expect.filter(n=>seen.has(n));
console.log(`\nexpected C4 E4 G4 C5 -> detected ${hit.length}/4: ${hit.join(', ')}`);
console.log(errs.length?'ERRORS: '+errs.slice(0,3).join(' | '):'no console errors ✓');
await b.close(); srv.close();
