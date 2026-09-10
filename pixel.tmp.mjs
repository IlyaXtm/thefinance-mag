import { chromium } from 'playwright-core';
const { PNG } = await import('/tmp/claude-0/tools/node_modules/pngjs/lib/png.js');

const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
const L = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const cr = (a,bg) => { const la=L(a), lb=L(bg); const [hi,lo]=la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); };

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ROUTE = process.argv[2] ?? '/mag';

for (const [tname, theme] of [['v1','v1'],['v2-dark','v2-dark'],['v2-light','v2-light']]) {
  const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
  await ctx.addInitScript(t=>{try{localStorage.setItem('tf-mag-theme',t)}catch{}}, theme);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3410'+ROUTE,{waitUntil:'networkidle'});
  await p.evaluate(() => window.scrollTo(0,0));

  const cands = await p.evaluate(() => {
    const out = []; const seen = new Set();
    [...document.querySelectorAll('body *')].forEach((el, i) => {
      const own = [...el.childNodes].some(n => n.nodeType===3 && n.textContent.trim().length>1);
      if (!own) return;
      const cs = getComputedStyle(el);
      if (cs.visibility==='hidden' || cs.display==='none') return;
      const r = el.getBoundingClientRect();
      if (r.width<6 || r.height<6) return;
      if (el.closest('.sr-only')) return;
      const key = cs.color+'|'+cs.fontSize+'|'+cs.fontWeight+'|'+(el.closest('[data-on-media]')?'m':'n');
      if (seen.has(key)) return; seen.add(key);
      el.setAttribute('data-cx', String(i));
      out.push({ id:String(i), color: cs.color, size: parseFloat(cs.fontSize),
                 weight: parseInt(cs.fontWeight,10)||400, text: el.textContent.trim().slice(0,26),
                 onMedia: !!el.closest('[data-on-media]') });
    });
    return out;
  });

  const rows = [];
  for (const c of cands) {
    const loc = p.locator(`[data-cx="${c.id}"]`).first();
    try { await loc.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch { continue; }
    const box = await loc.boundingBox();
    if (!box) continue;
    const vh = await p.evaluate(() => window.innerHeight);
    if (box.y < 0 || box.y + box.height > vh) continue;
    await p.evaluate(id => { const e=document.querySelector(`[data-cx="${id}"]`); e.dataset.oldColor = e.style.color; e.style.color='transparent'; }, c.id);
    let buf;
    try {
      buf = await p.screenshot({ clip: { x: Math.max(0,box.x), y: Math.max(0,box.y),
        width: Math.max(2, Math.min(box.width, 1440 - Math.max(0,box.x))),
        height: Math.max(2, box.height) } });
    } catch { await p.evaluate(id=>{const e=document.querySelector(`[data-cx="${id}"]`); e.style.color=e.dataset.oldColor||'';}, c.id); continue; }
    await p.evaluate(id => { const e=document.querySelector(`[data-cx="${id}"]`); e.style.color=e.dataset.oldColor||''; }, c.id);
    const png = PNG.sync.read(buf);
    let r=0,g=0,bl=0,n=0;
    for (let i=0;i<png.data.length;i+=4){ r+=png.data[i]; g+=png.data[i+1]; bl+=png.data[i+2]; n++; }
    const bg = [r/n, g/n, bl/n];
    const fg = c.color.match(/[\d.]+/g).map(Number);
    const a = fg.length===4 ? fg[3] : 1;
    const eff = fg.slice(0,3).map((v,i)=> v*a + bg[i]*(1-a));
    const large = c.size>=24 || (c.size>=18.66 && c.weight>=700);
    const need = large ? 3 : 4.5;
    const ratio = cr(eff,bg);
    rows.push({ ...c, bg: bg.map(Math.round), ratio: +ratio.toFixed(2), need, pass: ratio>=need });
  }
  rows.sort((x,y)=>x.ratio-y.ratio);
  const fails = rows.filter(r=>!r.pass);
  console.log(`\n== ${ROUTE}  ${tname}  —  ${rows.length} distinct text styles, ${fails.length} below threshold`);
  for (const r of rows.slice(0,7))
    console.log(`   ${r.pass?'ok  ':'FAIL'} ${String(r.ratio).padStart(6)} need ${r.need}  ${r.size}px/${r.weight}${r.onMedia?' [on-media]':''}  bg rgb(${r.bg})  "${r.text}"`);
  await ctx.close();
}
await b.close();
