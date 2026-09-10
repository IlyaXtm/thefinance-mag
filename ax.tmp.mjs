import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
for (const [tn,th] of [['v1','v1'],['v2-light','v2-light']]) {
  const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
  await ctx.addInitScript(t=>{try{localStorage.setItem('tf-mag-theme',t)}catch{}}, th);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3410/mag',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(600);
  console.log(tn, 'sr-only span display:', JSON.stringify(await p.evaluate(()=>{
    const dark=document.querySelector('[data-theme-when="dark"]');
    const light=document.querySelector('[data-theme-when="light"]');
    return { darkSpan: getComputedStyle(dark).display, lightSpan: getComputedStyle(light).display };
  })));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const btns = nodes.filter(n => n.role?.value === 'button' && n.name?.value);
  console.log('   buttons in AX tree:');
  for (const n of btns.slice(0,6)) console.log(`     "${n.name.value}"`);
  const links = nodes.filter(n => n.role?.value === 'link' && n.name?.value);
  const generic = links.filter(l => /ادامه|بیشتر بخوان|اینجا/.test(l.name.value));
  console.log(`   links: ${links.length}, with a generic name: ${generic.length}`);
  await ctx.close();
}
await b.close();
