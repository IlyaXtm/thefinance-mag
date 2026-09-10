import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
const p = await ctx.newPage();
await p.goto('http://localhost:3410/mag',{waitUntil:'networkidle'});

const describe = () => {
  const el = document.activeElement;
  const r = el.getBoundingClientRect();
  // accessible name, near enough: aria-label > <label for> > title > text
  let name = el.getAttribute('aria-label');
  if (!name && el.labels && el.labels.length) name = [...el.labels].map(l=>l.textContent).join(' ');
  if (!name) name = el.getAttribute('title');
  if (!name) name = el.textContent || '';
  return {
    tag: el.tagName.toLowerCase(),
    name: name.trim().replace(/\s+/g,' ').slice(0,42),
    absY: Math.round(r.top + window.scrollY),
    absX: Math.round(r.right + window.scrollX),
    ring: getComputedStyle(el).outlineWidth,
    expanded: el.getAttribute('aria-expanded'),
    pressed: el.getAttribute('aria-pressed'),
  };
};
await p.evaluate(()=>{window.scrollTo(0,0);document.body.focus();});
const stops=[];
for (let i=0;i<30;i++){ await p.keyboard.press('Tab'); stops.push(await p.evaluate(describe)); }
console.log('  #  tag     absY  absX   ring   name');
stops.forEach((s,i)=>console.log(`  ${String(i+1).padStart(2)} ${s.tag.padEnd(6)} ${String(s.absY).padStart(5)} ${String(s.absX).padStart(5)} ${s.ring.padEnd(6)} ${s.expanded!==null?'[exp='+s.expanded+'] ':''}${s.pressed!==null?'[pressed='+s.pressed+'] ':''}"${s.name}"`));

// reading-order check: within the main content, absY should be non-decreasing
const main = stops.slice(8);
let inversions = 0, worst = 0;
for (let i=1;i<main.length;i++){
  const d = main[i-1].absY - main[i].absY;
  if (d > 40) { inversions++; worst = Math.max(worst, d); }
}
console.log(`\n  reading-order inversions after the header: ${inversions} (largest backward jump ${worst}px)`);
await b.close();
