/* ============================================================
   Capture a whole GrabFood menu — Ya Kun Parkway Parade, or any outlet.

   1. Open the outlet page in Chrome/Edge, signed in, with your
      Marine Parade address set so the real menu loads.
   2. Scroll to the very bottom once, so every category has rendered.
   3. Press F12 -> Console tab.
   4. Paste everything below, press Enter.

   It downloads <outlet>-menu.txt and copies the same text to your
   clipboard. Then on the Birthday Celebration page:
      Set up -> "Import a menu straight from GrabFood" -> paste ->
      "Split it into the menus" -> check it -> "Save settings".

   Nothing is sent anywhere. It only reads the page already on screen.
   ============================================================ */

(() => {
  const q = (e, f) => e.querySelector('[class*="' + f + '"]');
  const t = n => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  const food = [], drink = [];
  let nf = 0, nd = 0, off = 0;

  document.querySelectorAll('[class*="category___"]').forEach(c => {
    const name = t(q(c, 'categoryName'));
    if (!name || /^for you$/i.test(name)) return;      // "For You" just repeats other rows
    const isDrink = /beverage|drink/i.test(name);
    const rows = [];

    c.querySelectorAll('[class*="menuItem___"]').forEach(m => {
      const n = t(q(m, 'itemNameTitle')) || t(q(m, 'itemName___'));
      const p = t(q(m, 'discountedPrice')) || t(q(m, 'itemPrice'));
      const v = (p.match(/(\d+\.\d{2})/) || [])[1];
      if (!n || !v) return;
      const dead = /menuItem--disable/.test(m.className);
      if (dead) off++;
      rows.push(n + ' | ' + v + (dead ? '   <-- shown as unavailable right now' : ''));
    });

    if (!rows.length) return;
    (isDrink ? drink : food).push('# ' + name, ...rows);
    if (isDrink) nd += rows.length; else nf += rows.length;
  });

  food.push('# —', 'Nothing for me, thanks | 0');
  drink.push('# —', 'No drink, thanks | 0');

  const out = '===== FOOD =====\n' + food.join('\n') +
              '\n\n===== DRINKS =====\n' + drink.join('\n') + '\n';

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain' }));
  a.download = (document.title.split('⭐')[0].trim().replace(/[^a-z0-9]+/gi, '-') || 'grab') + '-menu.txt';
  document.body.appendChild(a); a.click(); a.remove();
  try { navigator.clipboard.writeText(out); } catch (e) {}

  console.log('%cCaptured ' + nf + ' food + ' + nd + ' drinks' +
              (off ? '  (' + off + ' marked unavailable)' : ''),
              'font-size:15px;color:#0a7');
  console.log(out);
  return 'Downloaded ' + a.download;
})();
