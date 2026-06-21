# Komplexný audit aplikácie — 2026-06-21

Audit pre projekt **IPTV Playlist Generator** pokrýva web/PWA, Capacitor Android, Electron desktop, bezpečnostné hlavičky, service worker, lokálnu perzistenciu, import/export playlistov a release proces.

## Stručné zhrnutie

Aplikácia je funkčný statický Vue/Tailwind nástroj s podporou PWA, Androidu cez Capacitor a Electron desktopu. Oproti staršiemu akčnému plánu je väčšina kritických bodov opravená: Android artefakty sú synchronizované, identita aplikácie je zjednotená, backup v Androide je vypnutý, service worker už cacheuje iba explicitný app shell a importy z URL majú veľkostný limit.

Počas auditu bola nájdená a opravená jedna regresia v release artefaktoch: `www/index.html` sa líšil od root `index.html`. Spustením `npm run sync:www` boli synchronizované statické súbory pre Capacitor/Android.

## Overené oblasti

### 1. Build/release konzistencia

**Stav:** dobrý po oprave synchronizácie.

- `npm test` pôvodne zlyhal, pretože `www/index.html` nebol synchronizovaný s `index.html`.
- Spustený bol sync krok `npm run sync:www`, ktorý zosynchronizoval `www/index.html`, `www/manifest.json`, `www/sw.js` a ikony.
- Následný `npm test` prešiel.

**Riziko:** pri manuálnom vydávaní stále hrozí zabudnutie sync kroku, keďže aplikácia nemá reálny build pipeline a root aj `www/` artefakty existujú paralelne.

**Odporúčanie:** pred každým releasom vyžadovať `npm run sync:www && npm test`; ideálne pridať CI check, ktorý odmietne nesynchronizovaný `www/` adresár.

### 2. Frontend architektúra a udržiavateľnosť

**Stav:** funkčné, ale technický dlh je vysoký.

- Celá aplikácia je v jednom veľkom `index.html` súbore vrátane šablóny, štýlov, prekladov, parserov, import/export logiky, autodetekcie aj EPG logiky.
- Existujú iba základné statické kontroly cez `scripts/verify-static.js`.

**Riziko:** veľký monolitický súbor komplikuje review, testovanie parserov a izolované opravy. Zvyšuje sa pravdepodobnosť regresií pri úpravách UI aj dátovej logiky.

**Odporúčanie:** postupne vyčleniť minimálne tieto moduly:

1. parsovanie/import M3U a XSPF,
2. XMLTV/EPG parser,
3. validáciu URL a import limity,
4. storage/perzistenciu,
5. export M3U/XSPF,
6. autodetekciu a enrichment zdroje.

### 3. Bezpečnosť web/PWA

**Stav:** zmiešaný.

Pozitíva:

- CSP a HTTP security headers sú definované v `_headers`.
- Export M3U/XSPF escapuje XML špeciálne znaky cez `xmlEsc()`.
- Importované M3U/XSPF URL sa ukladajú iba po kontrole schémy.
- Service worker je obmedzený na explicitné lokálne app shell súbory a playlist/EPG dáta sú network-only.

Otvorené riziká:

- Vue sa stále načítava z `unpkg.com`, preto je ďalším krokom jeho lokálne vendoring/bundling.
- CSP stále povoľuje `unsafe-inline`, `unsafe-eval`, široké `connect-src *` a `img-src *`, pretože aplikácia používa inline Vue šablónu a používateľské stream/logo URL.
- Ikony sa renderujú cez `v-html`; aktuálne ide o interné SVG helpery, ale tento vzor treba držať striktne mimo používateľských dát.

**Odporúčanie:** po odstránení runtime Tailwind CDN pokračovať lokálnym vendoringom Vue alebo deterministickým buildom, potom sprísniť CSP na užší allowlist bez `unsafe-eval` a so zúženým `connect-src` podľa produktovej politiky.

### 4. Import, externé dáta a výkon

**Stav:** hlavné bezpečnostné limity sú doplnené, výkonové riziká ostávajú.

Pozitíva:

- Súborový import má 50 MB limit.
- URL import používa streamované čítanie s timeoutom a limitom.
- M3U a XSPF parsery kontrolujú URL pred uložením.

Riziká:

- XMLTV/EPG a veľké playlisty sa stále parsujú v hlavnom UI vlákne cez `DOMParser`/string operácie.
- Pri veľkých EPG súboroch môže UI zamrznúť, aj keď import má veľkostné limity.

**Odporúčanie:** presunúť veľké parsovanie do Web Workera alebo zaviesť chunkované spracovanie s priebežným yieldom do event loopu.

### 5. Android/Capacitor

**Stav:** dobrý.

- Android manifest má `android:allowBackup="false"`.
- App identita je konzistentná podľa verifikačného skriptu.
- Artefakty v `www/` sú po audite synchronizované.

**Odporúčanie:** doplniť CI alebo release check, ktorý spustí `npm run sync:www`, `npx cap sync android` a aspoň Android assemble/smoke build pred publikovaním.

### 6. Electron

**Stav:** primerane bezpečné minimum.

- `contextIsolation` a `sandbox` sú zapnuté.
- Aplikácia načítava lokálny `index.html`.

**Odporúčanie:** pri produkčnom desktop build-e otestovať, či CSP správanie z Netlify `_headers` má desktop ekvivalent. Pre Electron sa `_headers` nepoužije automaticky, preto treba bezpečnostnú politiku riešiť samostatne, ak desktop build považujete za rovnako dôležitý release target.

### 7. Závislosti

**Stav:** neúplne overené kvôli registry odpovedi.

- `npm audit --audit-level=moderate` nebolo možné vyhodnotiť, pretože audit endpoint vrátil `403 Forbidden`.
- Lokálne závislosti sú definované v `package-lock.json`, ale audit zraniteľností treba opakovať v prostredí s prístupom k npm audit endpointu.

**Odporúčanie:** spustiť audit v CI alebo lokálne mimo blokovaného prostredia; zvážiť Dependabot/Renovate a pravidelný `npm outdated` review.

## Prioritizované odporúčania

### P0 — okamžite / pred release

- Zachovať a vynucovať sync kontrolu `www/` artefaktov.
- Zopakovať `npm audit --audit-level=moderate` v prostredí, kde registry nevracia 403.

### P1 — vysoká priorita

- Dokončiť odstránenie zostávajúcej Vue CDN runtime závislosti.
- Sprísniť CSP po plnom bundlovaní assetov.
- Zaviesť CI workflow pre `npm run sync:www`, `npm test`, prípadne Android/Electron smoke check.

### P2 — stredná priorita

- Presunúť XMLTV a veľké playlist parsing workflow mimo hlavné UI vlákno.
- Rozdeliť monolitický `index.html` na testovateľné moduly.
- Doplniť unit testy parserov a validácie URL.

### P3 — údržba

- Dokumentovať Electron špecifiká bezpečnostnej politiky.
- Priebežne čistiť checklist v `AUDIT_ACTION_PLAN.md` podľa skutočne dokončených položiek.

## Spustené kontroly

| Kontrola | Výsledok | Poznámka |
|---|---:|---|
| `npm test` pred opravou | zlyhalo | `www/index.html` sa líšil od `index.html` |
| `npm run sync:www` | prešlo | zosynchronizované web/Capacitor artefakty |
| `npm test` po oprave | prešlo | statická verifikácia úspešná |
| `npm audit --audit-level=moderate` | nevyhodnotené | npm audit endpoint vrátil `403 Forbidden` |

## Audit verdikt

Aplikácia je po synchronizácii artefaktov releasovateľná pre statický web/PWA a má opravené viaceré predchádzajúce kritické nálezy. Najväčšie zostávajúce riziká sú zostávajúca Vue CDN závislosť, široká bezpečnostná politika potrebná pre súčasnú architektúru a udržiavateľnosť monolitického frontend súboru. Najbližší technický krok by mal byť zavedenie deterministického lokálneho buildu a následné sprísnenie CSP.
