import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });

const describe = () => ({
  tag: document.activeElement.tagName.toLowerCase(),
  name: (document.activeElement.getAttribute('aria-label') ||
         document.activeElement.getAttribute('title') ||
         document.activeElement.textContent || '').trim().replace(/\s+/g,' ').slice(0,38),
  outline: getComputedStyle(document.activeElement).outline,
  outlineW: getComputedStyle(document.activeElement).outlineWidth,
  shadow: getComputedStyle(document.activeElement).boxShadow.slice(0,30),
  y: Math.round(document.activeElement.getBoundingClientRect().top),
  x: Math.round(document.activeElement.getBoundingClientRect().right),
  href: document.activeElement.getAttribute('href'),
  expanded: document.activeElement.getAttribute('aria-expanded'),
});

for (const [tn, th] of [['v1','v1'],['v2-dark','v2-dark'],['v2-light','v2-light']]) {
  const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
  await ctx.addInitScript(t=>{try{localStorage.setItem('tf-mag-theme',t)}catch{}}, th);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.body.focus());
  const stops = [];
  for (let i=0;i<26;i++){
    await p.keyboard.press('Tab');
    stops.push(await p.evaluate(describe));
  }
  const noRing = stops.filter(s => s.outlineW === '0px' && !/rgb/.test(s.shadow));
  console.log(`\n===== ${tn} — first 26 tab stops on /mag`);
  console.log(`   stops with NO visible focus indicator: ${noRing.length}`);
  for (const n of noRing.slice(0,5)) console.log(`      ${n.tag} "${n.name}" outline=${n.outline}`);
  if (tn === 'v1') {
    stops.forEach((s,i)=>console.log(`   ${String(i+1).padStart(2)} ${s.tag.padEnd(6)} y=${String(s.y).padStart(5)} x=${String(s.x).padStart(5)}  ${s.expanded!==null?'[aria-expanded='+s.expanded+'] ':''}"${s.name}"`));
  }
  await ctx.close();
}
await b.close();
