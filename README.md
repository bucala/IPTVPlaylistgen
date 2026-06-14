# IPTV Playlist Generator v2

## Čo je hotové
- Apple-style statický frontend bez Python backendu
- Ukladanie dát do localStorage, vhodné pre Netlify static hosting
- Import `.m3u`, `.m3u8`, `.txt`, `.xspf`
- Export do M3U a XSPF
- PWA manifest + service worker
- Electron príprava pre Windows desktop app
- Capacitor config pre Android Studio

## Netlify deploy
1. Nahraj obsah repozitára na GitHub.
2. V Netlify nastav publish directory na root projektu.
3. `netlify.toml` už obsahuje SPA fallback.

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
Táto verzia je plne statická. Pôvodný FastAPI backend nebeží na Netlify, preto bola logika import/export a správy playlistu presunutá do browseru.
