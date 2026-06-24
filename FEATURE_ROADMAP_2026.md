# Nové funkcie a plán zlepšení IPTV Playlist Generator

Tento návrh dopĺňa existujúce auditné dokumenty o konkrétne produktové funkcie, ktoré by z aplikácie spravili plnohodnotný editor IPTV knižnice pre web aj pripravovanú Android aplikáciu.

## Priorita P0: opravy, ktoré priamo znižujú ručnú prácu

### 1. Inteligentné mapovania kanálov

**Cieľ:** Aplikácia si má pamätať ručne potvrdené väzby medzi názvom z playlistu a kanonickými metadátami.

Príklady:

- `Doma HD`, `Doma`, `TV Doma` → `Doma.sk`
- `DajTO`, `Daj To HD`, `Dajto` → `Dajto.sk`
- `Nova Sport 1 CZ` → `NovaSport1.cz`

**Návrh implementácie:**

- pridať lokálnu mapu `confirmedMappings` do IndexedDB/localStorage,
- pri autodetekcii dať potvrdeným mapovaniam prioritu pred fuzzy skóre,
- v UI pridať akciu `Zapamätať mapovanie`,
- umožniť export/import mapovaní ako JSON.

**Prínos:** Po prvom ručnom potvrdení sa rovnaký problém už neopakuje pri ďalšom playliste.

### 2. Náhľad zmien pred aplikovaním autodetekcie

**Cieľ:** Používateľ má jasne vidieť, čo sa zmení pred kliknutím na `Aplikovať`.

**Funkcie:**

- zobraziť diff `Pôvodné → Navrhnuté`,
- farebne odlíšiť doplnené, prepísané a rizikové hodnoty,
- samostatné prepínače pre `TVG-ID`, `TVG-Name`, `Logo URL`, `TVG URL`,
- hromadné pravidlo `aplikovať iba prázdne polia`.

**Prínos:** Menej chybných hromadných prepísaní.

### 3. Kontrola EPG krajiny

**Cieľ:** Zabrániť priradeniu `.pl`, `.uk`, `.us` EPG k CZ/SK kanálu, ak existuje `.sk` alebo `.cz` alternatíva.

**Funkcie:**

- panel `EPG kandidáti`, kde sa zobrazí poradie alternatív,
- pravidlo preferencie krajiny: `SK → CZ → bez krajiny → ostatné`,
- varovanie pri krížovej krajine, napr. `Markiza.pl` pre slovenský kanál,
- možnosť manuálne povoliť výnimku.

**Prínos:** Presnejšie EPG a menej neviditeľných chybných párovaní.

## Priorita P1: nové produktové funkcie

### 4. Import wizard

Krokový import by nahradil jednorazové načítanie súboru:

1. výber M3U/XSPF súboru alebo URL,
2. detekcia kódovania a formátu,
3. náhľad kanálov,
4. zistenie duplicít podľa URL, TVG-ID a názvu,
5. návrh čistenia názvov,
6. voliteľné spustenie autodetekcie,
7. finálny import.

### 5. Validátor streamov

**Funkcie:**

- kontrola dostupnosti URL s timeoutom,
- rozlíšenie `funkčné`, `nefunkčné`, `CORS neoveriteľné`, `timeout`,
- ukladanie času poslednej kontroly,
- hromadná kontrola vybraných kanálov,
- export reportu nefunkčných streamov.

### 6. Profily playlistov

Používateľ by mohol spravovať viac knižníc:

- `Hlavný TV`,
- `Mobil`,
- `Deti`,
- `Šport`,
- `CZ/SK`,
- `Test`.

Každý profil by mal vlastné filtre, kanály, poradie a export nastavenia.

### 7. Export presety

Predvoľby pre cieľové prehrávače:

- VLC,
- Kodi,
- TiviMate,
- IPTV Smarters,
- Enigma2,
- Samsung/LG aplikácie,
- vlastný preset.

Preset by definoval poradie atribútov, názov súboru, group-title pravidlá, kódovanie a podporované polia.

## Priorita P2: UI/UX a Android príprava

### 8. Detail kanála v bočnom paneli

Namiesto veľkého modalu na desktope:

- pravý detail panel,
- logo, názov, URL, TVG-ID, TVG-Name, TVG URL,
- aktuálny a ďalší program z EPG,
- posledné zmeny,
- návrhy autodetekcie.

Na mobile by sa rovnaký detail otvoril ako spodný sheet.

### 9. Mobilný spodný action bar

Pri označení kanálov sa zobrazí spodná lišta:

- `Autodetekcia`,
- `Presunúť do skupiny`,
- `Aktivovať/Vypnúť`,
- `Vymazať`,
- `Exportovať výber`.

### 10. Android režim offline-first

Pre Android aplikáciu pripraviť:

- IndexedDB/Capacitor Storage ako primárne úložisko,
- automatické zálohy pred hromadnými zmenami,
- share intent pre otvorenie `.m3u` súboru z Androidu,
- export cez Android share sheet,
- väčšie touch targety a spodnú navigáciu.

## Technické zlepšenia

### 11. Lokálna cache metadát s TTL

Cacheovať verejné indexy:

- EPG guide index: 24 hodín,
- logo index: 7 dní,
- M3U zdroje: 6–24 hodín podľa zdroja.

Používateľ by videl stav `Index načítaný pred 3 h` a akciu `Obnoviť teraz`.

### 12. Presun inline aplikácie na build krok

Aktuálne aplikácia používa browser Vue compiler, preto CSP musí povoľovať `unsafe-eval`. Dlhodobo je lepšie:

- rozdeliť aplikáciu na moduly,
- prejsť na Vite alebo podobný jednoduchý build,
- prekompilovať Vue šablóny,
- odstrániť `unsafe-eval` z CSP,
- zmenšiť JS payload a zlepšiť štart aplikácie.

### 13. Testovateľný autodetect engine

Autodetekciu vyčleniť z `index.html` do samostatného modulu:

- čisté funkcie pre normalizáciu,
- samostatné test fixtures pre CZ/SK playlisty,
- snapshot testy pre známe kanály,
- benchmark pre veľké playlisty.

## Navrhované poradie realizácie

1. Inteligentné mapovania kanálov.
2. Náhľad zmien pred aplikovaním autodetekcie.
3. Kontrola EPG krajiny.
4. Lokálna cache metadát.
5. Import wizard.
6. Validátor streamov.
7. Profily playlistov.
8. Android offline-first úložisko.
9. Presun na build krok a odstránenie `unsafe-eval`.

## Metriky úspechu

- minimálne 90 % SK/CZ kanálov dostane správne TVG-ID,
- minimálne 80 % kanálov dostane logo,
- žiadne automatické priradenie `.pl`/`.uk`, ak existuje `.sk`/`.cz`,
- import 500 kanálov pod 5 sekúnd po načítaní cache,
- používateľ vie vrátiť každú hromadnú zmenu jedným kliknutím.
