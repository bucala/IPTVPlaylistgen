# IPTV Playlist Generator

> Apple-style statická webová aplikácia pre správu IPTV playlistov — bez backendu, bez cloud účtu, bez inštalácie.

[![Verzia](https://img.shields.io/badge/verzia-2.6.0-0a84ff.svg)](CHANGELOG.md)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://iptvplaylistgen.pages.dev)
[![Licencia](https://img.shields.io/badge/licencia-MIT-30d158.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-ready-5c2d91.svg)](https://iptvplaylistgen.pages.dev/manifest.json)

**Live demo: [iptvplaylistgen.pages.dev](https://iptvplaylistgen.pages.dev)**

---

## Obsah

- [Funkcie](#-funkcie)
- [Rýchly štart](#-rýchly-štart)
- [Nasadenie na Cloudflare Pages](#️-nasadenie-na-cloudflare-pages)
- [Lokálny vývoj](#️-lokálny-vývoj)
- [EPG Autodetekcia — technické detaily](#-epg-autodetekcia--technické-detaily)
- [Technológie](#-technológie)
- [Dátový model](#-dátový-model)
- [Bezpečnosť](#-bezpečnosť)
- [Changelog](#-changelog)
- [Licencia](#-licencia)

---

## Funkcie

### Import playlistov

| Formát | Popis |
|--------|-------|
| **M3U / M3U8** | EXTINF metadáta: `tvg-id`, `tvg-name`, `tvg-logo`, `tvg-url`, `tvg-country`, `group-title` |
| **XSPF** | XML Shareable Playlist Format (track title, location, image, annotation) |
| **Zo súboru** | File picker, max **50 MB** |
| **Z URL** | Priame stiahnutie M3U/XSPF zo sieťovej URL |

- Automatická deduplikácia podľa stream URL
- Auto-detekcia kvality z názvu kanálu (`4K / FHD / HD / SD`)
- Počet importovaných a preskočených (duplicít) v toast hlásení

### Export

- **M3U** — EXTINF formát s plnými atribútmi (`tvg-id`, `tvg-name`, `tvg-logo`, `tvg-url`, `group-title`, `tvg-country`)
- **XSPF** — XML formát s title, location, image a annotation
- Exportujú sa iba **aktívne** kanály

### EPG — Electronic Program Guide

- Import **XMLTV** súborov (`.xml`, `.xmltv`) s parserom časových pásiem (`±HH:MM`)
- **Teraz / Ďalší** program zobrazený priamo v riadku tabuľky
- **Denný plán**: kliknutie na kanál otvorí panel s dnešnými programami
- Indikátor zhody EPG v stĺpci TVG-ID:
  - zelená — tvg-id má EPG záznamy
  - šedá — tvg-id existuje, ale bez EPG zhody
- Automatické parsovanie `<channel>` elementov pre display-name a icon/logo

### Autodetekcia metadát (EPG Enrichment)

Tlačidlo **Autodetekcia** (aktívne po načítaní EPG) otvorí modálne okno s automatickým priradením TVG metadát.

Podrobnosti pozri v sekcii [EPG Autodetekcia — technické detaily](#-epg-autodetekcia--technické-detaily).

- Farebné skóre zhody:
  - zelená ≥ 70 % — dobrá zhoda
  - oranžová 40–70 % — možná zhoda
  - červená < 40 % — slabá zhoda
- Editovateľné polia **TVG-ID**, **TVG-Name**, **Logo URL** pre každý kanál
- Filtre: Všetky / Len nájdené / Bez zhody
- Hromadný `select-all` + individuálny výber riadkov
- Súhrnné karty: Nájdených / Vybraných / Celkovo + % pokrytie
- **Aplikovať vybrané** — zmeny sa uložia do localStorage

### Správa knižnice

- Tabuľka so **radením podľa stĺpcov** (↑ / ↓, kliknutím na záhlavie)
- Raditeľné: Názov, Skupina, Kvalita, Krajina, Stav
- Filtrovanie: textové hľadanie, skupina, kvalita, krajina, aktívny/vypnutý
- Stránkovanie: 50 / 100 / 200 / 500 kanálov na stránku
- Pridanie, úprava, zmazanie kanálu s potvrdením
- Aktivovanie / deaktivovanie priamo z tabuľky
- **Dirty-check guard** — upozornenie pri zatváraní s neuloženými zmenami
- URL whitelist validácia: `http`, `https`, `rtmp`, `rtmps`, `rtsp`, `udp`, `rtp`

### Logá kanálov

- Lazy loading z `tvg-logo` URL s fade-in animáciou
- Fallback na **2-písmenový iniciálový placeholder** pri chybe načítania
- Live preview pri úprave URL loga v editačnom modali

### UI / UX

- **Apple HIG** dizajn — glass morphism, dynamické CSS premenné, smooth animácie
- **Svetlá / tmavá téma** — persist v `localStorage`, anti-FOUC inline skript
- **Slovenčina / Angličtina** — persist v `localStorage`, kompletný preklad
- Mobilný layout s horizontálnou **tab-bar navigáciou** (breakpoint ≤ 1024px)
- Kolapsovateľný **filter panel** na mobile s indikátorom aktívnych filtrov (●)
- **PWA** — inštalovateľná na iOS / Android home screen (manifest + SW)
- Klávesová skratka **Escape** — zatvorenie modalných okien v poradí priority

---

## Rýchly štart

Aplikácia nevyžaduje žiadnu inštaláciu. Otvor prehliadač:

```
https://iptvplaylistgen.pages.dev
```

### Prvé kroky

1. Klikni **Import Playlist** → vyber `.m3u` alebo `.m3u8` súbor
2. Kanály sa zobrazia v tabuľke s automaticky detegovanými kvalitami
3. Voliteľne načítaj EPG metadáta cez **Obohatiť metadáta** (EPG Enrichment)
4. Po načítaní EPG aktivuj **Autodetekcia** pre priradenie TVG metadát
5. Exportuj upravený playlist cez **Export M3U** alebo **Export XSPF**

---

## Nasadenie na Cloudflare Pages

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

> Ak vidíš v CI `npm install` alebo `wrangler deploy`, máš nastavený nesprávny build command — vymaž ho v nastaveniach.

### Konfiguračné súbory

| Súbor | Účel |
|-------|------|
| `_headers` | Bezpečnostné hlavičky (CSP, HSTS, Permissions-Policy …) |
| `_redirects` | SPA fallback routing (`/* /index.html 200`) |
| `manifest.json` | PWA manifest |
| `sw.js` | Service Worker (offline cache) |

---

## Lokálny vývoj

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

### Testovanie

```bash
npm test
```

Spúšťa `scripts/verify-static.js` + `scripts/verify-autodetect.js` (91 testov).

---

## EPG Autodetekcia — technické detaily

Autodetekcia priradí každému kanálu z playlistu správne `tvg-id`, `tvg-name`, `tvg-logo` a `tvg-url` na základe EPG XML zdrojov. Toto je komplikovaná logika — tu sú presné pravidlá.

### Zdroje EPG dát

Aplikácia pracuje s dvoma typmi zdrojov:

| Typ | Príklady | Popis |
|-----|----------|-------|
| **Open EPG XML** (`allowTvgUrl: true`) | `open-epg.com/files/slovakia1.xml`, `czech1.xml`, … | Plné XML s `<channel>` + `<programme>`. Poskytujú tvg-url aj metadáta. |
| **Globe EPG XML** (`metadataOnly: true`) | `globetvapp/epg/Slovakia/slovakia1.xml` | Iba `<channel>` metadáta (streamujú sa len po prvý `<programme>`). Nepoužívajú sa ako tvg-url. |

Predvolene aktívne Open EPG zdroje: `slovakia1/2/3.xml`, `czech1/3/4.xml`.

### Indexovanie XML

Pri načítaní každého Open EPG XML súboru sa každý `<channel id="...">` zaindexuje pod **normalizovaným kľúčom** (lowercase + bez diakritiky + bez medzier):

```
<channel id="Markíza Klasik.sk">
  <display-name>Markíza Klasik.sk</display-name>
</channel>
```

Uloží sa:
- `epgXmlIndex["markizaklasik.sk"]` → URL zdroja (napr. `slovakia1.xml`)
- `epgXmlChannelIdIndex["markizaklasik.sk"]` → `"Markíza Klasik.sk"` (presný originál vrátane diakritiky a `.sk`)
- `epgXmlDisplayNameIndex["markizaklasik.sk"]` → `"Markíza Klasik.sk"` (presný originál display-name vrátane `.sk`)

**Kľúčová zásada**: `.sk` a `.cz` prípony v `id` aj `display-name` sú súčasťou originálnych XML dát — nie sú chybou. Aplikácia ich nijako neupravuje.

### Algoritmus autodetekcie (5 fáz)

Pre každý kanál z playlistu:

#### Fáza 1 — Hľadanie IPTV kandaidáta

Skontrolujú sa potvrdené mapovanie (z predchádzajúcich spustení), iptv-org API, a fuzzy zhoda voči indexovaným kandidátom z M3U zdrojov.

**Krajina je absolútny hard-filter**: ak `tvg-id` kanálu v playliste má príponu `.sk`, kandidáti s `.cz` tvg-id sú **kompletne ignorovaní** (a naopak). Žiadne bodové bonusy — buď kandidát má správnu krajinu, alebo je vyradený.

Porovnanie názvov prebieha cez `normName()`, ktorá dočasne odsekne `.sk`/`.cz`, `HD`, `FHD`, `4K` atď. — takže `"Markíza Klasik"` sa porovná s `"Markíza Klasik.sk"` ako 100% zhoda.

#### Fáza 2 — Extrakcia počiatočných hodnôt

Z nájdeného kandidáta sa extrahujú `editId`, `editName`, `editTvgUrl`. Ak kandidát má `exact_tvg_id` a platný tvg-url, použijú sa ako počiatočné hodnoty (vrátane presného display-name z XML bez akejkoľvek úpravy).

#### Fáza 3 — XML kanonizácia

Pre každý kanál, ktorý má v `tvg-id` krajinu (`.sk` alebo `.cz`), sa vykoná lookup v `epgXmlIndex` pomocou normalizovaného kľúča odvodeného z `tvg-id` kanálu. Lookup filtruje výsledky podľa URL zdroja — pre `.sk` kanál akceptuje len URL zo `slovakia*.xml`.

Ak sa zhoda nájde:
- `editId` ← presný `id` z XML (s diakritikou, vrátane `.sk`)
- `editName` ← presný `display-name` z XML (vrátane `.sk` — **neorezáva sa!**)
- `editTvgUrl` ← URL XML zdroja (ak ešte nebola nastavená alebo bola z nesprávnej krajiny)

#### Fáza 4 — EPG fallbacky

Ak `editTvgUrl` stále chýba, pokúsi sa o lookup v `epgChannelIndex` a `epgXmlIndex`. Záloha cez `epgNameIndex` (hľadanie podľa normalizovaného názvu).

#### Fáza 5 — Finálna korekcia krajiny

Ak `editTvgUrl` nakoniec stále ukazuje na nesprávnu krajinu (napr. `.sk` kanál dostal `czech*.xml`), vykoná sa záverečný override z `epgXmlIndex` s filtrom pre správnu krajinu.

### Výsledné hodnoty v playliste

| Pole | Hodnota |
|------|---------|
| `tvg-id` | Presný atribút `id` z XML (napr. `Markíza Klasik.sk`) |
| `tvg-name` | Presný element `<display-name>` z XML (napr. `Markíza Klasik.sk`) |
| `tvg-url` | URL XML zdroja (napr. `https://www.open-epg.com/files/slovakia1.xml`) |
| `tvg-logo` | Z iptv-org API alebo zo zdrojového XML `<icon src="...">` |

> Prípony `.sk` / `.cz` sú v `tvg-id` a `tvg-name` **zámerné** — odrážajú presné hodnoty z EPG XML zdrojov.

### Príklad

Playlist obsahuje:
```
#EXTINF:-1 tvg-id="MarkizaKlasik.sk",Markiza Klasik
```

Slovakia XML (`open-epg.com/files/slovakia1.xml`) obsahuje:
```xml
<channel id="Markíza Klasik.sk">
  <display-name>Markíza Klasik.sk</display-name>
</channel>
```

Výsledok po autodetekcia:
```
tvg-id   = "Markíza Klasik.sk"
tvg-name = "Markíza Klasik.sk"
tvg-url  = "https://www.open-epg.com/files/slovakia1.xml"
```

---

## Technológie

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

**Bez build kroku** — žiadny webpack, vite ani transpilátory. Celá logika je v jedinom súbore `index.html` (~3 900 riadkov).

---

## Dátový model

Každý kanál je uložený v `localStorage` (kľúč `iptv-channels`) ako JSON objekt:

```json
{
  "id": "ch_1234567890",
  "name": "Televízia Markíza HD",
  "tvg_id": "Markíza.sk",
  "tvg_name": "Markíza.sk",
  "tvg_logo": "https://cdn.example.com/logo/markiza.png",
  "tvg_url": "https://www.open-epg.com/files/slovakia1.xml",
  "tvg_country": "SK",
  "group_title": "Slovenské",
  "url": "https://stream.example.com/markiza/hls/stream.m3u8",
  "quality": "HD",
  "is_active": true
}
```

> `tvg_id` a `tvg_name` obsahujú prípony `.sk`/`.cz` — toto je **správny formát** podľa XMLTV štandardu používaného EPG zdrojmi.

### Auto-detekcia kvality z názvu kanálu

| Kvalita | Rozpoznané kľúčové slová |
|---------|--------------------------|
| `4K` | `4K`, `UHD`, `2160` |
| `FHD` | `FHD`, `1080`, `FULL HD` |
| `HD` | `HD`, `720` (nie UHD/FHD) |
| `SD` | `SD`, `480`, `360` |
| *(prázdne)* | Nerozpoznané |

---

## Bezpečnosť

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

## Changelog

Pozri [CHANGELOG.md](CHANGELOG.md) pre úplný zoznam zmien.

**Posledná verzia: [2.6.0](CHANGELOG.md#260--2026-06-15)** — UI polish + Autodetekcia metadát z EPG.

---

## Prispievanie

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

## Právne upozornenie

IPTV Playlist Generator je nástroj na **správu playlistov** — nenačítava, neukladá ani nehostuje žiadne video streamy. Obsah streamov pochádza priamo od poskytovateľov, ktorých URL si používateľ sám nastaví. Za zákonnosť zdrojov v playliste zodpovedá výhradne používateľ.

---

## Licencia

[MIT](LICENSE) © [bucala](https://github.com/bucala)

---

<div align="center">

[Späť nahor](#iptv-playlist-generator) · [Changelog](CHANGELOG.md) · [Live demo](https://iptvplaylistgen.pages.dev)

</div>
