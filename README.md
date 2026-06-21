# 📺 IPTV Playlist Generator

> Apple-style statická webová aplikácia pre správu IPTV playlistov — bez backendu, bez cloud účtu, bez inštalácie.

[![Verzia](https://img.shields.io/badge/verzia-2.6.0-0a84ff.svg)](CHANGELOG.md)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://iptvplaylistgen.pages.dev)
[![Licencia](https://img.shields.io/badge/licencia-MIT-30d158.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-ready-5c2d91.svg)](https://iptvplaylistgen.pages.dev/manifest.json)

**🌐 Live demo: [iptvplaylistgen.pages.dev](https://iptvplaylistgen.pages.dev)**

---

## 📋 Obsah

- [Funkcie](#-funkcie)
- [Rýchly štart](#-rýchly-štart)
- [Nasadenie na Cloudflare Pages](#️-nasadenie-na-cloudflare-pages)
- [Lokálny vývoj](#️-lokálny-vývoj)
- [Technológie](#-technológie)
- [Dátový model](#-dátový-model)
- [Bezpečnosť](#-bezpečnosť)
- [Changelog](#-changelog)
- [Licencia](#-licencia)

---

## ✨ Funkcie

### 📥 Import playlistov

| Formát | Popis |
|--------|-------|
| **M3U / M3U8** | EXTINF metadáta: `tvg-id`, `tvg-name`, `tvg-logo`, `tvg-url`, `tvg-country`, `group-title` |
| **XSPF** | XML Shareable Playlist Format (track title, location, image, annotation) |
| **Zo súboru** | File picker, max **50 MB** |
| **Z URL** | Priame stiahnutie M3U/XSPF zo sieťovej URL |

- Automatická deduplikácia podľa stream URL
- Auto-detekcia kvality z názvu kanálu (`4K / FHD / HD / SD`)
- Počet importovaných a preskočených (duplicít) v toast hlásení

### 📤 Export

- **M3U** — EXTINF formát s plnými atribútmi (`tvg-id`, `tvg-name`, `tvg-logo`, `tvg-url`, `group-title`, `tvg-country`)
- **XSPF** — XML formát s title, location, image a annotation
- Exportujú sa iba **aktívne** kanály

### 📡 EPG — Electronic Program Guide

- Import **XMLTV** súborov (`.xml`, `.xmltv`) s parserom časových pásiem (`±HH:MM`)
- **▶ Teraz / ◎ Ďalší** program zobrazený priamo v riadku tabuľky
- **Denný plán**: kliknutie na kanál otvorí panel s dnešnými programami
- Indikátor zhody EPG v stĺpci TVG-ID:
  - 🟢 zelená — tvg-id má EPG záznamy
  - ⚫ šedá — tvg-id existuje, ale bez EPG zhody
- Automatické parsovanie `<channel>` elementov pre display-name a icon/logo

### 🔍 Autodetekcia metadát

Tlačidlo **🔍 Autodetekcia** (aktívne po načítaní EPG) otvorí modálne okno:

- Fuzzy matching názvov kanálov oproti EPG channel ID a `display-name`
  - Normalizácia diakritiky, quality markerov (HD, FHD, 4K), kódov krajín
  - Trigram similarity + substring matching
- Farebné skóre zhody:
  - 🟢 ≥ 70 % — dobrá zhoda
  - 🟠 40–70 % — možná zhoda
  - 🔴 < 40 % — slabá zhoda
- Editovateľné polia **TVG-ID**, **TVG-Name**, **Logo URL** pre každý kanál
- Filtre: Všetky / Len nájdené / Bez zhody
- Hromadný `select-all` + individuálny výber riadkov
- Súhrnné karty: Nájdených / Vybraných / Celkovo + % pokrytie
- **Aplikovať vybrané** — zmeny sa uložia do localStorage

### 📋 Správa knižnice

- Tabuľka so **radením podľa stĺpcov** (↑ / ↓, kliknutím na záhlavie)
- Raditeľné: Názov, Skupina, Kvalita, Krajina, Stav
- Filtrovanie: textové hľadanie, skupina, kvalita, krajina, aktívny/vypnutý
- Stránkovanie: 50 / 100 / 200 / 500 kanálov na stránku
- Pridanie, úprava, zmazanie kanálu s potvrdením
- Aktivovanie / deaktivovanie priamo z tabuľky
- **Dirty-check guard** — upozornenie pri zatváraní s neuloženými zmenami
- URL whitelist validácia: `http`, `https`, `rtmp`, `rtmps`, `rtsp`, `udp`, `rtp`

### 🖼️ Logá kanálov

- Lazy loading z `tvg-logo` URL s fade-in animáciou
- Fallback na **2-písmenový iniciálový placeholder** pri chybe načítania
- Live preview pri úprave URL loga v editačnom modali

### 🎨 UI / UX

- **Apple HIG** dizajn — glass morphism, dynamické CSS premenné, smooth animácie
- **Svetlá / tmavá téma** — persist v `localStorage`, anti-FOUC inline skript
- **Slovenčina / Angličtina** — persist v `localStorage`, kompletný preklad
- Mobilný layout s horizontálnou **tab-bar navigáciou** (breakpoint ≤ 1024px)
- Kolapsovateľný **filter panel** na mobile s indikátorom aktívnych filtrov (●)
- **PWA** — inštalovateľná na iOS / Android home screen (manifest + SW)
- Klávesová skratka **Escape** — zatvorenie modalných okien v poradí priority

---

## 🚀 Rýchly štart

Aplikácia nevyžaduje žiadnu inštaláciu. Otvor prehliadač:

```
https://iptvplaylistgen.pages.dev
```

### Prvé kroky

1. Klikni **Import Playlist** → vyber `.m3u` alebo `.m3u8` súbor
2. Kanály sa zobrazia v tabuľke s automaticky detegovanými kvalitami
3. Voliteľne importuj XMLTV EPG cez tlačidlo **📡 Import EPG**
4. Po načítaní EPG aktivuj **🔍 Autodetekcia** pre priradenie TVG metadát
5. Exportuj upravený playlist cez **Export M3U** alebo **Export XSPF**

---

## ☁️ Nasadenie na Cloudflare Pages

> **Dôležité**: Toto je čisto statický web. **Nenastavuj žiadny build command.**

### Kroky

1. Nahraj obsah repozitára na GitHub (fork alebo vlastný repo)
2. V [Cloudflare Pages](https://pages.cloudflare.com) → **Create a project** → **Connect to Git**
3. Vyber repozitár a nastav:

   | Pole | Hodnota |
   |------|---------|
   | Framework preset | `None` |
   | Build command | *(nechaj prázdne!)* |
   | Build output directory | `/` |

4. Klikni **Save and Deploy** — Cloudflare automaticky rozpozná `_headers` a `_redirects`

> ⚠️ Ak vidíš v CI `npm install` alebo `wrangler deploy`, máš nastavený nesprávny build command — vymaž ho v nastaveniach.

### Konfiguračné súbory

| Súbor | Účel |
|-------|------|
| `_headers` | Bezpečnostné hlavičky (CSP, HSTS, Permissions-Policy …) |
| `_redirects` | SPA fallback routing (`/* /index.html 200`) |
| `manifest.json` | PWA manifest |
| `sw.js` | Service Worker (offline cache) |

---

## 🛠️ Lokálny vývoj

### Webový preview

```bash
npm install
npm run start
# → http://localhost:3000
```

Používa `npx serve .` — priamy statický server, žiadny build krok.

### Windows desktop (Electron)

```bash
npm install
npm run win:start     # Spustí vývojový Electron
npm run win:build     # Buildne portable + NSIS installer
```

Výstup: `dist-electron/`

### Android (Capacitor + Android Studio)

```bash
npm install
npm run android:add    # Pridaj Android platformu (raz)
npm run android:sync   # Synchronizuj web assets do native projektu
npm run android:open   # Otvor Android Studio
```

V Android Studio buildni APK (debug) alebo AAB (release pre Play Store).

---

## 🧱 Technológie

| Vrstva | Technológia | Verzia |
|--------|------------|--------|
| UI Framework | [Vue 3](https://vuejs.org) Composition API (CDN global build) | `3.x` |
| Štýly | [Tailwind CSS](https://tailwindcss.com) CDN (Oxide/WASM engine) | `v4` |
| Písmo | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts | — |
| Perzistencia | `localStorage` (žiadny backend, žiadna DB) | — |
| Offline / PWA | Service Worker + Web App Manifest | — |
| Desktop shell | [Electron](https://electronjs.org) | `^31` |
| Mobile shell | [Capacitor](https://capacitorjs.com) | `^8` |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) | — |
| Dev server | [serve](https://www.npmjs.com/package/serve) | `^14` |

**Bez build kroku** — žiadny webpack, vite ani transpilátory. Celá logika je v jedinom súbore `index.html` (~2 000 riadkov).

---

## 📦 Dátový model

Každý kanál je uložený v `localStorage` (kľúč `iptv-channels`) ako JSON objekt:

```json
{
  "id": "ch_1234567890",
  "name": "Televízia Markíza HD",
  "tvg_id": "markiza.sk",
  "tvg_name": "Markíza HD",
  "tvg_logo": "https://cdn.example.com/logo/markiza.png",
  "tvg_url": "https://epg.example.com/epg.xml",
  "tvg_country": "SK",
  "group_title": "Slovenské",
  "url": "https://stream.example.com/markiza/hls/stream.m3u8",
  "quality": "HD",
  "is_active": true
}
```

### Auto-detekcia kvality z názvu kanálu

| Kvalita | Rozpoznané kľúčové slová |
|---------|--------------------------|
| `4K` | `4K`, `UHD`, `2160` |
| `FHD` | `FHD`, `1080`, `FULL HD` |
| `HD` | `HD`, `720` (nie UHD/FHD) |
| `SD` | `SD`, `480`, `360` |
| *(prázdne)* | Nerozpoznané |

---

## 🔒 Bezpečnosť

### Content Security Policy (`_headers`)

```
default-src     'self'
script-src      'self' 'unsafe-inline' 'unsafe-eval'
                https://unpkg.com
style-src       'self' 'unsafe-inline'
                https://fonts.googleapis.com
font-src        https://fonts.gstatic.com data:
img-src         * data: blob:
connect-src     * blob: https:
worker-src      'self'
manifest-src    'self'
```

| Direktíva | Dôvod |
|-----------|-------|
| `'unsafe-eval'` | Vue 3 runtime template compiler (`new Function()`) |
| `data:` v `font-src` | Kompatibilita s lokálnymi/inline font assetmi |

### HTTP Security Headers

| Hlavička | Hodnota |
|----------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### Ďalšie opatrenia

- `xmlEsc()` sanitizuje všetky hodnoty pri M3U/XSPF exporte (prevencia XSS)
- URL whitelist validácia v `saveEdit()` pred každým uložením
- Limit **50 MB** na importované súbory (kontrola pred FileReader)
- `no-cache` pre `index.html` a `sw.js` — vždy čerstvá verzia z CDN

---

## 📋 Changelog

Pozri [CHANGELOG.md](CHANGELOG.md) pre úplný zoznam zmien.

**Posledná verzia: [2.6.0](CHANGELOG.md#260--2026-06-15)** — UI polish + Autodetekcia metadát z EPG.

---

## 🤝 Prispievanie

1. **Fork** repozitára
2. Vytvor feature branch: `git checkout -b feat/moja-funkcia`
3. Commit zmien: `git commit -m "feat: popis zmeny"`
4. Push: `git push origin feat/moja-funkcia`
5. Otvor **Pull Request** s popisom zmien a test plánom

### Konvencie commit správ

| Prefix | Použitie |
|--------|----------|
| `feat:` | Nová funkcionalita |
| `fix:` | Oprava chyby |
| `chore:` | Údržba, konfigurácia, závislosti |
| `docs:` | Dokumentácia |

---

## ⚖️ Právne upozornenie

IPTV Playlist Generator je nástroj na **správu playlistov** — nenačítava, neukladá ani nehostuje žiadne video streamy. Obsah streamov pochádza priamo od poskytovateľov, ktorých URL si používateľ sám nastaví. Za zákonnosť zdrojov v playliste zodpovedá výhradne používateľ.

---

## 📜 Licencia

[MIT](LICENSE) © [bucala](https://github.com/bucala)

---

<div align="center">

[⬆ Späť nahor](#-iptv-playlist-generator) · [📋 Changelog](CHANGELOG.md) · [🌐 Live demo](https://iptvplaylistgen.pages.dev)

</div>
