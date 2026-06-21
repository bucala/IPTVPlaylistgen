# Audit Action Plan

Pracovny plan oprav po komplexnom audite aplikacie IPTV Playlist Generator.
Statusy su zamerne ponechane ako checklist, aby sa dali priebezne doplnat, rozdelit alebo odskrtavat.

## P0 - Kriticke

- [x] Opravit Android/Capacitor artefakt v `www/`
  - Problem: `www/index.html` je nekompletny a zastarany. Android nepouziva aktualny root `index.html`.
  - Akcia: zosynchronizovat `www/` s aktualnou webovou verziou alebo zaviest jasny build/copy krok, ktory vzdy generuje `www` z root artefaktov.
  - Vystup: Android pouziva rovnaku funkcnu aplikaciu ako web/PWA.

- [x] Zjednotit identitu aplikacie
  - Problem: Capacitor stale pouziva `QRcodenator`, kym zvysok projektu pouziva IPTV Playlist Generator.
  - Akcia: opravit `capacitor.config.json`, Android strings, package metadata a manifesty tak, aby mali jednotny `appId`, nazov a popisy.
  - Vystup: konzistentna identita pre Web, Electron aj Android.

## P1 - Vysoka priorita

- [x] Aktualizovat Electron
  - Problem: Electron 31 je mimo podporovanych stable linii.
  - Akcia: upgradovat Electron na aktualne podporovanu stable verziu, otestovat spustenie a build Windows balika.
  - Vystup: desktop verzia bezi na podporovanom Chromiu/Node runtime.

- [ ] Sprisnit CSP a odstranit produkcne CDN runtime zavislosti
  - Problem: CSP povoluje `unsafe-inline`, `unsafe-eval`, `connect-src *`, `img-src *` a aplikacia nacitava Vue/Tailwind z CDN.
  - Akcia: prejst na lokalne bundlovane alebo pinovane JS a CSS; nasledne zuzit `script-src`, `connect-src`, `img-src`, `worker-src`.
  - Vystup: mensia supply-chain a XSS plocha.

- [x] Zaviest limit pre import z URL
  - Problem: file import ma 50 MB limit, ale URL import a autodetect stahuju odpoved cez `res.text()` bez limitu.
  - Akcia: citat response stream po castiach, kontrolovat maximalnu velkost, typ obsahu a timeout.
  - Vystup: vzdialeny zdroj nemoze jednoducho zamrazit UI velkou odpovedou.

- [x] Validovat URL aj pri importe playlistov
  - Problem: manualne ulozenie URL validuje schemu, ale importovane M3U/XSPF polozky sa ukladaju priamo.
  - Akcia: pouzit jednotnu validaciu pre `saveEdit`, `parseM3U`, `parseXSPF`, autodetect a export.
  - Vystup: v datach aj exportoch su len ocakavane stream URL.

- [x] Dorovnat nedotiahnute bugfixy z poznamok
  - Problem: `BUGFIX_NOTES.md` popisuje opravy pre autodetect race condition a prazdny `tvg_url`, ktore v kode stale nie su aplikovane.
  - Akcia: upravit `openAutoDetect()` a `applyAutoDetect()` podla poznamok, potom pridat minimalne testovacie pripady.
  - Vystup: autodetekcia sa sprava podla dokumentovanych oprav.

## P2 - Stredna priorita

- [x] Upravit Service Worker cache strategiu
  - Problem: root SW je lepsi nez `www/sw.js`, ale stale cachuje vseobecne GET odpovede; Android SW je stary.
  - Akcia: cachovat iba app shell a explicitne staticke assets, network-only pre playlisty, EPG, API a pouzivatelske URL.
  - Vystup: menej stale dat a menej unikov cez cache.

- [ ] Presunut velke parsovanie mimo hlavne UI vlakno
  - Problem: XMLTV a velke playlisty sa parsuju naraz v hlavnom threade.
  - Akcia: pouzit Web Worker alebo chunkovane parsovanie pre M3U/XMLTV.
  - Vystup: UI ostava responzivne aj pri velkych EPG/playlist suboroch.

- [x] Lepsie osetrit `localStorage` chyby
  - Problem: chyby ukladania a poskodeny JSON sa ticho ignoruju.
  - Akcia: zobrazit pouzivatelovi chybu pri quota exceeded, pridat recovery pre poskodeny storage a export/backup dat.
  - Vystup: pouzivatel nestraca data potichu.

- [x] Zvazit vypnutie Android backupu
  - Problem: Android ma `allowBackup=true`, pricom appka moze obsahovat sukromne playlist URL.
  - Akcia: rozhodnut podla produktovej politiky; pravdepodobne nastavit `android:allowBackup="false"`.
  - Vystup: mensie riziko prenosu citlivych lokalnych dat mimo zariadenia.

- [x] Zjednotit verzie napriec projektom
  - Problem: `package.json`, README/CHANGELOG a Android verzia sa nezhoduju.
  - Akcia: urcit jednu aktualnu verziu a premietnut ju do package, lockfile, Android `versionName/versionCode`, README a changelogu.
  - Vystup: release metadata su doveryhodne.

## P3 - Kvalita a udrzba

- [x] Zaviest jednoduchy testovaci/lint workflow
  - Problem: projekt ma no-op build a ziadne realne automaticke overenie.
  - Akcia: pridat minimalne HTML/JS syntax check, unit testy parserov a smoke test pre hlavne UI.
  - Vystup: chyby typu rozbity `www/index.html` sa zachytia pred releasom.

- [ ] Oddelit logiku z velkeho `index.html`
  - Problem: cela aplikacia je v jednom velkom subore, co komplikuje testovanie aj audit.
  - Akcia: postupne vyclenit parsery, storage, export, autodetect a EPG logiku do samostatnych modulov.
  - Vystup: jednoduchsie testy, mensie riziko regresii.

- [x] Doplnit release checklist
  - Problem: web, PWA, Electron a Android maju rozdielne artefakty a rizika.
  - Akcia: vytvorit checklist: sync `www`, update verzie, audit deps, smoke test web, Electron start/build, Android build, PWA cache test.
  - Vystup: opakovatelny release proces.

## Console remediation - 2026-06-21

- [x] P0: Odstranit rozbite autodetect URL z produkcie
  - `iptv-org` playlisty pouzivaju GitHub Pages endpointy namiesto zaniknutych `raw.githubusercontent.com/.../master/index.m3u` odkazov.
  - EPG index pouziva aktualny `iptv-org/api/guides.json` namiesto 404 `iptv-org.github.io/epg/channels.json`.
  - CORS-blokovane `open-epg.com` XML zdroje boli odstranene z predvolenych enrichment zdrojov.

- [x] P1: Odstranit Tailwind browser CDN warning
  - Runtime `https://cdn.tailwindcss.com` bol odstraneny z HTML aj CSP.
  - Pouzivane utility triedy su nahradene lokalnym CSS subsetom v aplikacnom stylesheet-e.

- [x] P2: Osetrit Service Worker network-only chyby
  - Network-only fetch poziadavky teraz vracaju kontrolovanu 504 odpoved namiesto nezachytenej promise rejection v `sw.js`.

- [x] P3: Odstranit deprecation warning pre PWA meta tag
  - Doplneny je standardny `mobile-web-app-capable` meta tag popri Apple kompatibilnom tagu.

## TVG-ID/logo remediation - 2026-06-21

- [x] Preferovat iba SK/CZ TVG-ID pri autodetekcii
  - Globalne `iptv-org` zhody s koncovkami ako `.br`, `.pl`, `.ru` alebo `.et` sa uz automaticky neaplikuju.
  - Pri rovnakej normalizovanej zhode sa preferuje `.sk`, potom `.cz`, potom iba ID bez krajiny.

- [x] Opravit logo fallbacky
  - Logo mapovanie kombinuje `api/channels.json` s `api/logos.json`.
  - Logo podla nazvu sa neprepise globalnym zdrojom, ak existuje SK/CZ kandidat.

- [x] Opravit EPG URL doplnanie
  - EPG URL sa beru z aktualneho `api/guides.json` formatu cez `sources[].url` a viazu sa na normalizovane SK/CZ TVG-ID.

## Free EPG/logo source remediation - 2026-06-21

- [x] Doplnit legalne free EPG zdroje pre CZ/SK autodetekciu
  - Autodetekcia teraz vie indexovat XMLTV kanaly aj display-name hodnoty z GitHub EPG XML zdrojov (`globetvapp/epg`, `radoslavv/epg`).
  - EPG URL fallback hlada najprv TVG-ID a potom normalizovany nazov kanala, aby sa zvysilo pokrytie pri zdrojoch bez identickeho TVG-ID.

- [x] Doplnit robustne logo mapovanie z free API
  - Logo index sa sklada z `iptv-org/api/channels.json` aj `iptv-org/api/logos.json` a podporuje `channel`, `id` aj `channels[]` format.
