# 📋 Changelog — IPTV Playlist Generator

Všetky významné zmeny v projekte sú dokumentované v tomto súbore.

> Formát je založený na [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)  
> Projekt používa [Sémantické verziovanie](https://semver.org/).

---

## [2.6.0] — 2026-06-15

### UI polish + Autodetekcia metadát z EPG

#### Added
- **🔍 Autodetekcia** — nové tlačidlo v hlavičke (aktívne po načítaní EPG) otvára modálne okno pre automatické priradenie metadát:
  - Fuzzy-matching každého kanálu podľa názvu oproti EPG channel ID a `display-name` (trigram similarity + substring matching)
  - Normalizácia diakritiky, quality markerov (HD/FHD/4K), kódov krajín pred porovnávaním
  - Farebné skóre zhody: 🟢 ≥ 70 %, 🟠 40–70 %, 🔴 < 40 %
  - Editovateľné polia TVG-ID, TVG-Name, Logo URL pri každom kanáli
  - Filtre: Všetky / Len nájdené / Bez zhody
  - Hromadný `select-all` checkbox + individuálny výber riadkov
  - Súhrnné karty: Nájdených / Vybraných / Celkovo + % pokrytie
  - Tlačidlo **Aplikovať vybrané** uloží zmeny do localStorage
  - **Spustiť znova** pre opakované spustenie matchingu po úprave

#### Fixed
- **Označovanie textu** — bunky tabuľky (`td`) majú explicitne `user-select: text; -webkit-user-select: text` tak, aby kopírovanie textu z kanálov fungovalo vo všetkých prehliadačoch
- **Šipky triedenia** — neaktívne stĺpce neukazujú `↕`; iba aktívny stĺpec zobrazuje `↑` alebo `↓`; ikona má vyhradený `min-width`, aby sa layout nemenšil pri prepínaní
- **Duplicitné ovládacie prvky** — tab Dizajn už neopakuje prepínač témy a jazyka; namiesto toho zobrazuje stručnú poznámku smerujúcu do hlavičky

#### Changed
- **EPG parser** — `parseXMLTV` teraz extrahuje aj `<channel>` elementy (display-name + icon/logo URL) do `epgChannelMeta` pre potreby Autodetekcie

---

## [2.5.0] — 2026-06-15

### Raditeľné stĺpce, Logo a EPG/XMLTV podpora

#### Added
- **Sortable column headers** — kliknutím na záhlavie stĺpca radiš tabuľku; ďalší klik otočí smer
  - Raditeľné: Názov, Skupina, Kvalita, Krajina, Stav
  - `↑` / `↓` indikátor na aktívnom stĺpci, `aria-sort` atribút pre screen readery
- **EPG/XMLTV import** — tlačidlo 📡 v hlavičke:
  - Parser XMLTV formátu (`<programme channel start stop>`) s ošetrením časových pásiem (`±HH:MM`)
  - Toast po načítaní: `N programov, M kanálov s EPG`
  - EPG Tlačidlo sa zmení na 🟢 **Zmazať EPG** po úspešnom načítaní
- **Teraz / Ďalší program** — v riadku kanálu pod názvom (keď je EPG načítané)
- **Denný plán** — kliknutím na riadok kanálu sa otvorí panel s dnešnými programami a zvýraznením `on-air` programu
- **EPG indikátor** v stĺpci TVG-ID: 🟢 zelená = EPG dostupné, ⚫ šedá = bez zhody
- **Logo fade-in animácia** pri načítaní obrázka kanálu
- **Initiálový placeholder** — 2-písmenový fallback pri chybe načítania loga
- **Live logo preview** v editačnom modalnom okne vedľa URL poľa
- **TVG URL pole** — nové pole `tvg_url` v dátovom modeli, formulári aj M3U exporte

#### Removed
- Duplicitný seg-button sort control (Názov / Skupina / Kvalita / Krajina) z hlavičky Library — nahradený raditeľnými záhlaviami stĺpcov

---

## [2.4.3] — 2026-06-15

### Oprava CSP: unsafe-eval a data: font-src

#### Fixed
- **Vue 3 EvalError** — Vue 3 runtime template compiler (`vue.global.prod.js`) používa `new Function()` na kompiláciu DOM šablón za behu; vyžaduje `'unsafe-eval'` (nie len `'wasm-unsafe-eval'`). Bez tejto direktívy Vue hodilo `EvalError` a aplikácia sa neodmontovala → čierna obrazovka
- **Font CSP chyba** — Tailwind v4 CDN embeduje fonty (Inter, …) ako base64 `data:` URI namiesto načítavania z `fonts.gstatic.com`. Predchádzajúci `font-src` povoloval len `https://fonts.gstatic.com` → všetky fonty boli blokované

---

## [2.4.2] — 2026-06-15

### Oprava wrangler.toml a prázdny build command

#### Fixed
- **Nesprávny Cloudflare deploy** — `wrangler.toml` spúšťal príkaz `wrangler deploy` (Cloudflare Workers príkaz) namiesto natívneho Pages statického deploymentu
- Odstraňuje sa `wrangler.toml`; Cloudflare Pages deploy funguje bez akéhokoľvek build commandu

#### Changed
- **README** — pridané explicitné upozornenie: build command musí zostať prázdny; vysvetlené dôsledky nesprávneho nastavenia

---

## [2.4.1] — 2026-06-15

### Oprava CSP pre Tailwind v4 CDN

#### Fixed
- **Čierna obrazovka na Cloudflare Pages** — `https://cdn.tailwindcss.com` servíruje Tailwind v4, ktorý používa Oxide (Rust/WASM) engine a blob-based Web Workers na kompiláciu CSS za behu. Predchádzajúci CSP blokoval obe, čo spôsobovalo tiché zlyhanie Tailwindu a kolaps layoutu

| Direktíva | Zmena |
|-----------|-------|
| `script-src` | `+ 'wasm-unsafe-eval'` |
| `style-src` | `+ https://cdn.tailwindcss.com` |
| `connect-src` | `+ https:` |
| `worker-src` | `+ blob: https://cdn.tailwindcss.com` |

---

## [2.4.0] — 2026-06-15

### Migrácia hostingu z Netlify na Cloudflare Pages

#### Added
- **`_headers`** — všetky bezpečnostné hlavičky (CSP, HSTS, Permissions-Policy, X-Frame-Options, …) pre Cloudflare Pages natívny formát
- **`_redirects`** — SPA fallback routing (`/* /index.html 200`)
- **No-op build script** — `"build": "echo 'Static site — no build step'"` v `package.json` zabraňuje Cloudflare inštalovať Electron a Capacitor závislosti pri každom deployi

#### Removed
- `netlify.toml` — nahradený `_headers` a `_redirects`
- `wrangler.toml` — spôsoboval nesprávny Workers deploy (opravené v 2.4.2)

#### Changed
- **README** — aktualizované inštrukcie pre Cloudflare Pages deploy

---

## [2.3.0] — 2026-06-15

### Mobile UX: tab bar, language switcher, filter panel

#### Added
- **Horizontálna mobilná tab-bar navigácia** (`.mob-tabs`) zobrazená pod hlavičkou na ≤ 1024px
  - Library 📺 / Content 📊 / Design 🎨 s badge počtu kanálov
  - Automaticky sa skryje pri ≥ 1024px
- **Kolapsovateľný filter panel** v Library tabe na mobile (`lg:hidden`)
  - Tlačidlo „Filter ▼" s indikátorom aktívnych filtrov (●)
  - Obsahuje search, group/quality select, country input, per-page, status seg-control
  - Auto-zatvára sa pri prepnutí taba
- **🌐 globe ikona** vo vnútri `lang-sw` pillu — SK/EN prepínač je okamžite rozpoznateľný
- `hasActiveFilters` computed — zobrazuje ● ked je aktívny akýkoľvek filter
- `mobFilterOpen` ref — riadi viditeľnosť mobilného filter panela

#### Removed
- Tab **Platforms** a sekcia **Platform Prep** — nie sú súčasťou novej statickej SPA

#### Fixed
- **Mobilný layout** — `.app-sidebar` je teraz `display:none` na ≤ 1024px; sidebar sa nezobrazoval pod hlavným obsahom

---

## [2.2.0] — 2026-06-15

### Bezpečnostný audit: URL validácia, 50 MB limit, duplicáty

#### Added
- **URL whitelist validácia** v `saveEdit()` — povolené schémy: `http`, `https`, `rtmp`, `rtmps`, `rtsp`, `udp`, `rtp`; pri odmietnutí sa zobrazí toast a kanál sa neuloží
- **50 MB limit** v `importFromFile()` — kontrola veľkosti súboru pred spustením `FileReader`; zobrazí toast a preruší import
- **Počet duplicít** v import toaste — „Importovaných N kanálov · M preskočených (duplicity)"
- Nové i18n kľúče: `invalidUrl`, `fileTooLarge`, `skippedDuplicates` (SK + EN)

---

## [2.1.0] — 2026-06-15

### PWA polish: anti-FOUC, Service Worker, toast fix

#### Added
- **Anti-FOUC inline skript** — číta `iptv-theme` a `iptv-lang` z `localStorage` pred akýmkoľvek Vue renderom; zabraňuje bliknutiu témy/jazyka pri načítaní stránky
- **`<noscript>` fallback** pre prostredia bez JavaScriptu
- **Service Worker registrácia** v `onMounted()` — aktivuje offline caching
- **`apple-touch-icon`** meta tag — ikona pre iOS home-screen

#### Changed
- **Toast Vue transition** — opravená: `margin-bottom` namiesto konfliktu s `transform: translateX(-50%)` centrovania
- **`manifest.json`** — opravené `short_name`, `theme_color` na `#0a84ff`, `orientation: any`, separátne maskable/any icon záznamy

#### Fixed
- Sort šípky (↑/↓) na aktívnom sort tlačidle s `aria-hidden`

---

## [2.0.0] — 2026-06-15

### Kompletná Apple HIG statická SPA

Kompletný prepis z FastAPI+SQLite backendu na plne klientskú Vue 3 aplikáciu bez akéhokoľvek backendu.

#### Added
- **Vue 3 Composition API** — celá logika v jedinom `index.html` (~1 500 riadkov), žiadny build krok
- **localStorage perzistencia** — kanály, téma, jazyk uložené lokálne v prehliadači
- **Knižnica (Library tab)** — tabuľka so sortovaním, filtrovaním (hľadanie / skupina / kvalita / krajina / stav), stránkovaním (50–500/strana)
- **Content tab** — kvalita stat karty (4K/FHD/HD/SD) + prehľad skupín s filtrovacím skratkou
- **Design tab** — prepínač témy (svetlá/tmavá) + prepínač jazyka (SK/EN) persist v localStorage
- **Import modál** — file picker (M3U/M3U8/XSPF) a URL režim s auto-detekciou formátu; deduplikácia URL
- **Edit/Add channel modál** — všetky TVG polia, quality selector, aktívny prepínač
- **Delete confirm alertdialog** — potvrdenie pred zmazaním kanálu
- **Unsaved Changes alertdialog** — `editIsDirty` dirty-check guard pre ochranu neuložených zmien
- **Toast notifikácie** — `aria-live="polite"` pre screen readery
- **Kompletná ARIA** — `role=dialog/alertdialog/grid/switch`, `aria-modal`, `aria-current="page"`, `aria-required`, `aria-pressed`, `aria-labelledby`, `aria-live`, `aria-atomic`
- **Klávesová skratka Escape** — zatvára najtopnejší otvorený modal v správnom poradí priority
- **SK/EN i18n** — kompletný preklad všetkých UI textov v oboch jazykoch
- **`xmlEsc()`** — bezpečný export M3U/XSPF atribútov (prevencia XSS)
- **M3U export** — EXTINF formát s plnými atribútmi; iba aktívne kanály
- **XSPF export** — XML formát

#### Changed
- **Architektúra** — z FastAPI+SQLite backendu na čisto statickú SPA hostovanú na Netlify (neskôr Cloudflare Pages)
- **Perzistencia** — z SQLite databázy na `localStorage`

---

## [2.0.0-beta] — 2026-06-14

### Prvý prepis na statickú SPA (Apple HIG)

#### Added
- Apple HIG dizajn systém — CSS premenné, glass morphism, Inter font
- Svetlá / tmavá téma
- Základná Library tabuľka so sortovaním a stránkovaním
- SK/EN jazykový prepínač (`lang-sw` pill)
- PWA manifest + Service Worker (`sw.js`)
- Electron shell pre Windows (`electron/main.js`)
- Capacitor config pre Android (`capacitor.config.json`)
- Bezpečnostné hlavičky cez `netlify.toml` (CSP, HSTS, Permissions-Policy)

---

## [1.0.0] — 2026-06-14

### Počiatočná verzia — FastAPI backend

Pôvodná implementácia s Python backendom. Neskôr nahradená statickou SPA (v2.x).

#### Added
- **FastAPI backend** s SQLite databázou (SQLAlchemy ORM)
- **Channel API** — CRUD operácie, filtrovanie, radenie, stránkovanie, bulk operácie
- **Import/Export API** — M3U, M3U8, XSPF, CSV, plain text
- **EPG service** — integrácia s iptv-org databázou pre TVG-ID a logo matching (fuzzy matching cez rapidfuzz)
- **Vue 3 + Tailwind CSS** frontend SPA bez build kroku
- Import modál s drag-and-drop
- Export modál s výberom formátu a filtrovania
- Channel editor s logo preview, bulk operácie
- EPG auto-matching modál
- Real-time štatistiky dashboard

---

<div align="center">

[⬆ Späť nahor](#-changelog--iptv-playlist-generator) · [📖 README](README.md) · [🌐 Live demo](https://iptvplaylistgen.pages.dev)

</div>
