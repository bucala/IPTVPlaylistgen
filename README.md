# IPTV Playlist Generator

## Čo je hotové
- Apple-style statický frontend bez Python backendu
- Ukladanie dát do localStorage, vhodné pre Cloudflare Pages static hosting
- Import `.m3u`, `.m3u8`, `.txt`, `.xspf`
- Export do M3U a XSPF
- PWA manifest + service worker
- Electron príprava pre Windows desktop app
- Capacitor config pre Android Studio

## Cloudflare Pages deploy

> **Dôležité**: Toto je čisto statický web. Nenastavuj žiadny build command ani deploy command.

1. Nahraj obsah repozitára na GitHub.
2. V Cloudflare Pages → Settings → Builds & deployments nastav:
   - **Framework preset**: `None`
   - **Build command**: *(prázdne — nechaj prázdne!)*
   - **Build output directory**: `/`
3. `_headers` obsahuje všetky bezpečnostné hlavičky (CSP, HSTS, atď.).
4. `_redirects` zabezpečuje SPA fallback routing (`/* /index.html 200`).
5. Nasaď — Cloudflare Pages automaticky rozpozná `_headers` a `_redirects`.

> Ak vidíš, že CI spúšťa `npm install` alebo `wrangler deploy`, máš nastavený nesprávny build/deploy command. Zmaž ho.

## Lokálny preview
```bash
npm install
npm run start
```

## Windows app
```bash
npm install
npm run win:build
```
Výstup bude v `dist-electron/`.

## Android Studio
```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```
Potom buildni APK alebo AAB priamo v Android Studio.

## Poznámka
Táto verzia je plne statická. Pôvodný FastAPI backend nebeží na Cloudflare Pages, preto bola logika import/export a správy playlistu presunutá do browseru.
