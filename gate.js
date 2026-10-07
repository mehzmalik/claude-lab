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
  var DEFAULT_HASH = '18c4825efeda1e9ee4985b717a698a89b3d2a733d765ca2dfa792119abd58087'; // athena-cro-2026
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

  var css = [
    '.cl-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;',
    'background:rgba(78,45,130,.28);-webkit-backdrop-filter:blur(26px) saturate(1.25);backdrop-filter:blur(26px) saturate(1.25);font-family:"Source Sans 3","Source Sans Pro",system-ui,sans-serif;visibility:visible}',
    '.cl-gate form{width:min(420px,100%);background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.7);border-radius:24px;padding:40px 32px;box-shadow:0 24px 80px rgba(22,15,65,.25),inset 0 1px 0 rgba(255,255,255,.8);text-align:center}',
    '.cl-gate h1{margin:0 0 6px;font-size:26px;font-weight:400;color:#4e2d82}',
    '.cl-gate p{margin:0 0 24px;font-size:15px;line-height:1.4;color:#160f41;opacity:.72}',
    '.cl-gate .row{display:flex;gap:8px;padding:6px 6px 6px 18px;border:1px solid rgba(208,193,233,.9);border-radius:40px;background:rgba(255,255,255,.7)}',
    '.cl-gate input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;color:#1c1249}',
    '.cl-gate button{border:0;border-radius:30px;background:#622fb4;color:#fff;font:inherit;font-weight:600;font-size:15px;padding:0 20px;height:44px;cursor:pointer}',
    '.cl-gate button:hover{background:#5428a0}',
    '.cl-gate .err{display:none;margin:14px 0 0;color:#b4233c;font-size:14px;opacity:1}',
    '.cl-gate.shake form{animation:cl-shake .35s}',
    '@keyframes cl-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}',
    '.cl-gate small{display:block;margin-top:22px;font-size:12px;color:#160f41;opacity:.5}'
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
