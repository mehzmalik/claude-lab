/*
 * claude-lab password gate
 * ------------------------
 * Drop <script src="…/gate.js" data-hash="…"></script> as the FIRST thing in <head>.
 * The page stays hidden until the visitor enters a password whose salted SHA-256 matches
 * `data-hash` (or the DEFAULT_HASH below). Unlock is remembered for the browser session.
 *
 * To change a password:   printf 'claude-lab::%s' 'new-password' | shasum -a 256
 * then paste the hash into DEFAULT_HASH (site-wide) or into a page's data-hash (per-experiment).
 *
 * Honest note: this runs in the browser of a public, static site. It deters casual visitors who
 * only have the link; it does not protect files from anyone who browses the repository itself.
 */
(function () {
  var SALT = 'claude-lab::';
  var DEFAULT_HASH = '20bb084fc6fa3ecef8d0fc7f2edb852de063089bc9cf8ebeb0cf4ccaa9b8a174'; // set by setup.sh from GATE_PASSWORD in .env
  var me = document.currentScript;
  var HASH = (me && me.getAttribute('data-hash')) || DEFAULT_HASH;
  var KEY = 'claude-lab-unlocked:' + HASH;
  var SITE_KEY = 'claude-lab-unlocked:' + DEFAULT_HASH;

  try {
    if (sessionStorage.getItem(KEY) === '1' || (HASH !== DEFAULT_HASH && sessionStorage.getItem(SITE_KEY) === '1' && me.getAttribute('data-strict') !== 'true')) return;
  } catch (e) { /* storage unavailable — fall through and ask */ }

  // Hide the page immediately (before first paint).
  var hide = document.createElement('style');
  hide.id = 'cl-gate-hide';
  hide.textContent = 'html{visibility:hidden!important;overflow:hidden!important}';
  (document.head || document.documentElement).appendChild(hide);

  var BG = me && me.src ? new URL('assets/gate-bg.png', me.src).href : 'assets/gate-bg.png';
  var css = [
    '.cl-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;overflow:hidden;',
    'background:#0b0a2a;font-family:"Source Sans 3","Source Sans Pro",system-ui,sans-serif;visibility:visible}',
    /* Polaris "BNT Glass" background, blurred */
    '.cl-gate::before{content:"";position:absolute;inset:-48px;background:url("' + BG + '") center/cover no-repeat;filter:blur(22px) saturate(1.15);transform:scale(1.04)}',
    '.cl-gate::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 50%,rgba(10,9,42,0) 40%,rgba(10,9,42,.45) 100%)}',
    '.cl-gate form{position:relative;z-index:1;width:min(440px,100%);background:rgba(28,26,96,.38);-webkit-backdrop-filter:blur(24px) saturate(1.3);backdrop-filter:blur(24px) saturate(1.3);',
    'border:1px solid rgba(255,255,255,.28);border-radius:16px;padding:44px 36px;box-shadow:0 30px 90px rgba(5,4,30,.55),inset 0 1px 0 rgba(255,255,255,.35);text-align:center;color:#fff}',
    '.cl-gate h1{margin:0 0 6px;font-size:28px;font-weight:400;color:#fff;letter-spacing:.2px}',
    '.cl-gate p{margin:0 0 26px;font-size:15px;line-height:1.4;color:#fff;opacity:.72}',
    '.cl-gate .row{display:flex;gap:8px;padding:6px 6px 6px 18px;border:1px solid rgba(255,255,255,.35);border-radius:40px;background:rgba(255,255,255,.12)}',
    '.cl-gate .row:focus-within{border-color:rgba(255,255,255,.7);background:rgba(255,255,255,.16)}',
    '.cl-gate input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;color:#fff}',
    '.cl-gate input::placeholder{color:rgba(255,255,255,.6)}',
    '.cl-gate button{border:0;border-radius:30px;background:#fff;color:#1c1249;font:inherit;font-weight:600;font-size:15px;padding:0 22px;height:44px;cursor:pointer}',
    '.cl-gate button:hover{background:#efeaf7}',
    '.cl-gate .err{display:none;margin:14px 0 0;color:#ffb3c1;font-size:14px;opacity:1}',
    '.cl-gate.shake form{animation:cl-shake .35s}',
    '@keyframes cl-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}',
    '.cl-gate small{display:block;margin-top:24px;font-size:12px;color:#fff;opacity:.5}'
  ].join('');

  async function sha256(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var gate = document.createElement('div');
    gate.className = 'cl-gate';
    gate.innerHTML =
      '<form autocomplete="off">' +
        '<h1>claude-lab</h1>' +
        '<p>This experiment is shared privately. Enter the password to continue.</p>' +
        '<div class="row"><input type="password" name="pw" placeholder="Password" aria-label="Password" autofocus>' +
        '<button type="submit">Open</button></div>' +
        '<p class="err" role="alert">That password isn’t right. Try again.</p>' +
        '<small>Mehzabeen Malik · Bounteous</small>' +
      '</form>';
    document.body.appendChild(gate);
    // Reveal the document (the gate covers everything beneath it).
    var h = document.getElementById('cl-gate-hide');
    if (h) h.textContent = 'html{overflow:hidden!important}';

    var form = gate.querySelector('form'), input = gate.querySelector('input'), err = gate.querySelector('.err');
    input.focus();
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var ok = false;
      try { ok = (await sha256(SALT + input.value)) === HASH; } catch (_) { ok = false; }
      if (ok) {
        try { sessionStorage.setItem(KEY, '1'); } catch (_) {}
        gate.remove(); if (h) h.remove();
      } else {
        err.style.display = 'block'; input.value = ''; input.focus();
        gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake');
      }
    });
  }

  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
