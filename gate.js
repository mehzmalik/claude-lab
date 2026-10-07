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

  // Pure-JS SHA-256 (FIPS 180-4) — used when crypto.subtle is unavailable, e.g. on plain-HTTP pages.
  function sha256js(str) {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var bytes = new TextEncoder().encode(str), l = bytes.length, bitLen = l * 8;
    var padLen = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(padLen); m.set(bytes); m[l] = 0x80;
    var dv = new DataView(m.buffer); dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000)); dv.setUint32(padLen - 4, bitLen >>> 0);
    var w = new Uint32Array(64), rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var off = 0; off < padLen; off += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) { var s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3), s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10); w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0; }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (i = 0; i < 64; i++) {
        var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d + t1) >>> 0; d=c; c=b; b=a; a=(t1 + t2) >>> 0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0; H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  async function sha256(text) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      } catch (_) { /* fall through */ }
    }
    return sha256js(text);
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
