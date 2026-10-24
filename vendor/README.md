# Vendored runtime

| File | Source | npm integrity |
|------|--------|---------------|
| `vue-3.5.44.global.prod.js` | `vue@3.5.44` → `dist/vue.global.prod.js` (MIT) | `sha512-dvvmaOCG7lAMkJTPqPwWeGMsPS6DIsFsfZDUgBp9V6mHf9b3+/wyVwYR4Es+WV6uJC0FKRxp81Obcq0ZwUcGFQ==` |

Vue is served from the app's own origin instead of a CDN so the app (web PWA, Android, Windows)
starts offline and a new Vue release can never change the runtime without a commit.

## Upgrading Vue

```bash
npm pack vue@<version>                    # verify: npm view vue@<version> dist.integrity
tar -xzf vue-<version>.tgz package/dist/vue.global.prod.js
mv package/dist/vue.global.prod.js vendor/vue-<version>.global.prod.js
```

Then replace the old version in `index.html` (`<script src>`), `sw.js` (`VUE_RUNTIME`, bump `CACHE_NAME`),
delete the old file, run `npm run sync:www` and `npm test`.
