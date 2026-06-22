# Návrh vylepšení aplikácie IPTV Playlist Generator

Tento dokument navrhuje produktové, funkčné, UI/UX a technické zlepšenia po sérii auditov autodetekcie, EPG, log a PWA správania. Cieľom je posunúť aplikáciu z jednorazového generátora playlistov na spoľahlivý editor knižnice kanálov pre CZ/SK používateľov.

## 1. Funkcie s najvyšším dopadom

### 1.1 Sprievodca importom a čistením playlistu

**Problém:** Po importe väčšieho M3U playlistu používateľ často nevie, čo presne sa našlo, ktoré kanály sú duplicitné, ktoré majú zlé TVG-ID a ktoré nemajú EPG/logo.

**Návrh:** Pridať krokový import wizard:

1. výber zdroja alebo súboru,
2. náhľad zistených kanálov,
3. detekcia duplicít podľa URL, TVG-ID a normalizovaného názvu,
4. automatické čistenie názvov (`HD`, `[CZ]`, bitrate, provider suffixy),
5. výber, či importovať všetko alebo iba nové/aktívne kanály,
6. automatické spustenie autodetekcie po importe.

**Prínos:** Menej manuálneho opravovania a menej chýb pri prvom nastavení knižnice.

### 1.2 Skóre kvality metadát pre každý kanál

**Problém:** Používateľ nevidí jasne, či je kanál kompletný alebo potrebuje opravu.

**Návrh:** Zobraziť pri každom kanáli stavový indikátor metadát:

- TVG-ID nájdené,
- TVG-Name vyplnené,
- logo dostupné,
- EPG URL dostupné,
- EPG aktuálne načítané,
- URL streamu validná.

Použiť farebný badge napr. `92 % metadata`, s detailom po kliknutí.

**Prínos:** Používateľ okamžite vidí, ktoré kanály treba riešiť.

### 1.3 Validátor streamov

**Problém:** Aplikácia upravuje playlist, ale nehovorí, či stream URL reálne funguje.

**Návrh:** Pridať voliteľnú kontrolu dostupnosti streamov:

- HEAD/GET s timeoutom,
- detekcia HTTP statusu,
- detekcia CORS/blokovania,
- posledná úspešná kontrola,
- hromadná kontrola iba vybraných kanálov.

**Poznámka:** V prehliadači bude časť zdrojov blokovaná CORS; UI musí jasne rozlišovať `nefunkčné` vs. `neoveriteľné v prehliadači`.

### 1.4 História zmien a undo/redo

**Problém:** Hromadná autodetekcia môže prepísať stovky kanálov a používateľ sa bojí aplikovať návrhy.

**Návrh:** Pridať lokálnu históriu zmien:

- undo poslednej operácie,
- redo,
- porovnanie pred/po pre hromadné zmeny,
- export zálohy pred aplikovaním autodetekcie.

**Prínos:** Bezpečnejšie hromadné úpravy.

### 1.5 Profily a viac knižníc

**Problém:** Používateľ môže spravovať viac playlistov pre rôzne zariadenia, krajiny alebo členov rodiny.

**Návrh:** Pridať profily:

- `Hlavný TV`, `Mobil`, `Deti`, `CZ/SK`, `Šport`,
- samostatné kanály, filtre a export nastavenia,
- duplikovanie profilu,
- export/import profilu ako JSON.

## 2. Autodetekcia, EPG a logá

### 2.1 Režim „iba bezpečné zmeny“

**Problém:** Pri slabších zhodách môže autodetekcia navrhnúť nesprávne ID alebo logo.

**Návrh:** Pridať prepínač autodetekcie:

- **Bezpečný režim:** aplikuje iba 95–100 % zhody a SK/CZ ID.
- **Vyvážený režim:** aplikuje zhodu nad napr. 70 %.
- **Agresívny režim:** ukáže aj slabé zhody, ale neaplikuje ich automaticky.

### 2.2 Manuálne potvrdené mapovania

**Problém:** Niektoré kanály sa budú vždy volať inak v playliste a inak v EPG zdroji.

**Návrh:** Ukladať používateľom potvrdené mapovania:

- `AXN HD` → `AXN.cz`,
- `Doma HD` → `Doma.sk`,
- `Canal + Action` → `CanalPlusAction.cz`.

Pri ďalšej autodetekcii majú tieto mapovania vyššiu prioritu než fuzzy logika.

### 2.3 Správa zdrojov metadát

**Problém:** Zdrojov je viac a používateľ nevie, ktorý je spoľahlivý.

**Návrh:** Pridať obrazovku „Zdroje metadát“:

- zapnúť/vypnúť zdroj,
- krajina,
- typ: playlist, EPG, logo,
- licencia/poznámka,
- posledný úspešný fetch,
- počet nájdených kanálov,
- CORS/HTTP stav.

### 2.4 Lokálna cache metadát s TTL

**Problém:** Autodetekcia opakovane sťahuje veľké zdroje.

**Návrh:** Cacheovať iba verejné metadata indexy do IndexedDB s TTL:

- EPG guide index napr. 24 hodín,
- logo index napr. 7 dní,
- možnosť „obnoviť teraz“.

**Prínos:** Rýchlejšia autodetekcia a menej chýb pri dočasnom výpadku zdroja.

## 3. UI/UX vylepšenia

### 3.1 Lepšia tabuľka kanálov

**Návrh:**

- sticky hlavička tabuľky,
- nastaviteľné stĺpce,
- hustota zobrazenia: komfortná/kompaktná,
- rýchle inline editovanie TVG-ID, skupiny a kvality,
- zvýraznenie buniek, ktoré boli zmenené poslednou autodetekciou.

### 3.2 Bočný panel detailu kanála

**Problém:** Modálne okno prerušuje prácu s tabuľkou.

**Návrh:** Namiesto edit modalu pridať pravý detail panel:

- názov, logo, stream URL,
- TVG-ID, TVG-Name, EPG URL,
- aktuálny a ďalší program,
- návrhy autodetekcie,
- história zmien kanála.

### 3.3 Porovnanie pôvodné vs. navrhnuté

**Návrh:** V autodetekcii zobraziť diff štýlom:

- zelené = doplnené,
- žlté = zmenené,
- červené = potenciálne rizikové,
- sivé = bez zmeny.

Používateľ tak ľahko rozlíši, či sa mení iba prázdne pole alebo prepisuje existujúca hodnota.

### 3.4 Prázdne stavy a vysvetlenia

**Návrh:** Pri `Žiadna zhoda v EPG` ukázať konkrétny dôvod:

- zdroj sa nenačítal,
- kanál nemá SK/CZ kandidáta,
- zhoda bola príliš slabá,
- EPG URL existuje, ale je CORS-blokovaná,
- používateľ má zapnutý bezpečný režim.

### 3.5 Mobilná použiteľnosť

**Návrh:**

- cards view pre kanály na mobile,
- spodný action bar pre vybrané kanály,
- veľké touch targety,
- export/import akcie schované do menu,
- lepšie riešenie veľkých modalov na malých obrazovkách.

## 4. Export a kompatibilita

### 4.1 Export presetov

**Návrh:** Pridať export preset:

- VLC/Kodi,
- TiviMate,
- IPTV Smarters,
- Enigma2,
- Samsung/LG TV aplikácie,
- vlastný preset.

Preset určí napr. formát atribútov, poradie polí, group-title, kódovanie a názov súboru.

### 4.2 Export podľa filtrov

**Návrh:** Exportovať iba:

- aktívne kanály,
- vybranú skupinu,
- vybrané krajiny,
- kanály so 100 % metadátami,
- kanály bez neoveriteľných URL.

### 4.3 Import/export nastavení aplikácie

**Návrh:** Samostatný export konfigurácie:

- profily,
- zdroje metadát,
- manuálne mapovania,
- UI preferencie,
- cache nezahŕňať alebo zahŕňať voliteľne.

## 5. Technické vylepšenia podporujúce UX

### 5.1 Presun veľkých operácií do Web Workerov

Parsovanie veľkých M3U/XMLTV súborov a fuzzy matching by mali bežať mimo hlavného UI vlákna. UI potom môže ukazovať progres a ostane plynulé.

### 5.2 IndexedDB namiesto iba localStorage

`localStorage` stačí na menšie dáta, ale pre profily, históriu, cache metadát a veľké playlisty je vhodnejšia IndexedDB.

### 5.3 Testy parserov a autodetekcie

Pridať unit testy pre:

- normalizáciu názvov,
- TVG-ID varianty,
- EPG guide parsing,
- XMLTV display-name indexovanie,
- logo fallbacky,
- import/export M3U/XSPF.

### 5.4 Voliteľný backend/proxy režim

Pre čisto frontend PWA zachovať súčasný režim. Voliteľne však pridať proxy/backend pre:

- CORS-blokované EPG zdroje,
- server-side stream validáciu,
- plánované refreshovanie zdrojov,
- zdieľané profily medzi zariadeniami.

## 6. Navrhovaná roadmapa

### Fáza 1 — rýchle UX výhry

1. dôvody nezhody v autodetekcii,
2. bezpečný/vyvážený/agresívny režim autodetekcie,
3. metadata completeness badge,
4. export podľa filtrov,
5. potvrdené manuálne mapovania.

### Fáza 2 — práca s veľkými knižnicami

1. import wizard,
2. hromadný diff pred aplikovaním,
3. undo/redo a záloha pred autodetekciou,
4. nastaviteľné stĺpce tabuľky,
5. IndexedDB storage.

### Fáza 3 — pokročilé metadáta

1. správa zdrojov metadát,
2. cache s TTL,
3. Web Worker matching/parsing,
4. stream validátor,
5. EPG program preview pri kanáli.

### Fáza 4 — power-user funkcie

1. profily a viac knižníc,
2. export presety,
3. voliteľný proxy/backend režim,
4. synchronizácia medzi zariadeniami,
5. CI testy a fixture katalóg reálnych CZ/SK kanálov.
