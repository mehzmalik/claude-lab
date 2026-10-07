# claude-lab

Experiments and prototypes, published with GitHub Pages at
https://mehzmalik.github.io/claude-lab/

| Folder | What it is |
|---|---|
| `athena-cro-prototype/` | athenahealth homepage CRO test designs (Option 3, Conversational experience) |

## Password gate

Every page loads `gate.js` first, which shows a frosted-glass password prompt and remembers the
unlock for the browser session. The password is checked against a salted SHA-256 hash, so the
password itself is not in the source.

* Site-wide password: `DEFAULT_HASH` in `gate.js`.
* Per-experiment password: add `data-hash="…"` to that page's `<script src="../gate.js">` tag
  (and `data-strict="true"` if the site-wide unlock should *not* open it).
* To make a hash:

  ```bash
  printf 'claude-lab::%s' 'your-password' | shasum -a 256
  ```

**Honest limitation:** this is a static, public site. The gate deters casual visitors who only have
the link, but anyone who browses the repository on GitHub can see every file and image. Anything
that must truly stay private belongs in a private repo behind real access control (e.g. Cloudflare
Pages + Access).
