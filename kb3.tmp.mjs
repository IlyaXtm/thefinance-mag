import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
const p = await ctx.newPage();
await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});

// which container do the "inversion" stops belong to?
await p.evaluate(()=>{window.scrollTo(0,0);document.body.focus();});
for (let i=0;i<20;i++) await p.keyboard.press('Tab');
console.log('stop 20 container:', await p.evaluate(()=>{
  let n=document.activeElement, path=[];
  while(n && path.length<5){ path.push(n.tagName.toLowerCase()+(n.getAttribute('aria-label')?`[${n.getAttribute('aria-label')}]`:'')); n=n.parentElement; }
  return path.join(' < ');
}));

// ── the markets disclosure ──
await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});
await p.evaluate(()=>{window.scrollTo(0,0);document.body.focus();});
for (let i=0;i<5;i++) await p.keyboard.press('Tab');   // land on بازارها
const at = () => p.evaluate(()=>({tag:document.activeElement.tagName.toLowerCase(),
  name:(document.activeElement.getAttribute('aria-label')||document.activeElement.textContent||'').trim().slice(0,24),
  exp:document.activeElement.getAttribute('aria-expanded')}));
console.log('\nMARKETS DISCLOSURE');
console.log('  focused:', JSON.stringify(await at()));
await p.keyboard.press('Enter'); await p.waitForTimeout(250);
console.log('  after Enter:', JSON.stringify(await at()),
  '| panel open =', await p.evaluate(()=>{const b=document.querySelector('button[aria-expanded]'); const pn=document.getElementById(b.getAttribute('aria-controls')); return pn ? getComputedStyle(pn).display!=='none' && getComputedStyle(pn).visibility!=='hidden' : null;}));
await p.keyboard.press('Tab'); console.log('  Tab 1 →', JSON.stringify(await at()));
await p.keyboard.press('Tab'); console.log('  Tab 2 →', JSON.stringify(await at()));
for (let i=0;i<8;i++) await p.keyboard.press('Tab');
console.log('  after 10 tabs (escaped the panel?) →', JSON.stringify(await at()));
// reopen and test Escape
await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});
await p.evaluate(()=>{window.scrollTo(0,0);document.body.focus();});
for (let i=0;i<5;i++) await p.keyboard.press('Tab');
await p.keyboard.press('Enter'); await p.waitForTimeout(200);
await p.keyboard.press('Tab');
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
console.log('  after Escape:', JSON.stringify(await at()),
  '| focus back on trigger =', await p.evaluate(()=>document.activeElement.getAttribute('aria-expanded')!==null));

// ── theme toggle name ──
console.log('\nTHEME TOGGLE');
console.log(' ', JSON.stringify(await p.evaluate(()=>{
  const btns=[...document.querySelectorAll('header button')];
  const t=btns.find(x=>/زمینه/.test(x.textContent||'')||/زمینه/.test(x.getAttribute('aria-label')||''));
  return t ? { ariaLabel:t.getAttribute('aria-label'), text:(t.textContent||'').trim().replace(/\s+/g,' '),
    pressed:t.getAttribute('aria-pressed'), title:t.getAttribute('title') } : null;
})));

// ── skip link ──
console.log('\nSKIP LINK');
await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});
await p.evaluate(()=>document.body.focus());
await p.keyboard.press('Tab');
console.log('  first tab stop:', JSON.stringify(await at()));
console.log('  <main> has id:', await p.evaluate(()=>document.querySelector('main')?.id || null));
await b.close();
