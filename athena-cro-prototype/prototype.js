/* Light interactivity for the prototype (no framework). */

// 10 x 3 dot grid in the "100% Onboarded" tile — one <img> per Figma ellipse asset.
const dots = document.getElementById('dots');
if (dots) {
  for (let i = 1; i <= 30; i++) {
    const img = document.createElement('img');
    img.src = `assets/dot-${i}.svg`;
    img.alt = '';
    dots.appendChild(img);
  }
}

// Suggested-question chips fill the ask bar.
const ask = document.querySelector('.ask');
const input = ask && ask.querySelector('input');
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    if (!input) return;
    input.value = chip.textContent.trim().replace(/\s+/g, ' ');
    input.focus();
  });
});
if (ask) {
  ask.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    input.value = '';
    input.placeholder = `Thanks — we'd route "${q}" to the right place.`;
    setTimeout(() => { input.placeholder = input.dataset.placeholder || input.placeholder; }, 3500);
  });
  if (input) input.dataset.placeholder = input.placeholder;
}

// V3 side-panel pager: dots cycle the card order.
const pager = document.querySelector('.pager');
const list = document.querySelector('.panel-list');
if (pager && list) {
  pager.querySelectorAll('button').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      pager.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', 'false'));
      btn.setAttribute('aria-current', 'true');
      const cards = [...list.children];
      list.append(...cards.slice(idx), ...cards.slice(0, idx));
    });
  });
}

// Collapsible navigation (tablet / mobile).
const menuBtn = document.querySelector('.nav-menu-btn');
const navBar = document.querySelector('.nav-bar');
if (menuBtn && navBar) {
  const close = () => { navBar.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const open = navBar.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => { if (!navBar.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', (m) => { if (m.matches) close(); });
}
