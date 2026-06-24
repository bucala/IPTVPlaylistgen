# Návrhy nových nastavení a práce v aplikácii

Tento dokument zhŕňa praktické možnosti, ktoré by mohli rozšíriť IPTV Playlist Generator bez zmeny základného offline-first charakteru aplikácie. Cieľom je znížiť ručnú prácu pri importe playlistov, EPG, TVG-ID a logách a zároveň sprístupniť pokročilé správanie cez jasné nastavenia.

## 1. Nastavenia importu playlistu

- **Import profil**: používateľ si vyberie profil `Bezpečný`, `Štandardný` alebo `Agresívny`, ktorý nastaví mieru čistenia názvov, odstraňovania kvalitatívnych sufixov a automatického prepisu metadát.
- **Detekcia kvality pri importe**: samostatné prepínače pre rozpoznanie `4K`, `FHD`, `HD`, `SD` z názvu kanála, URL alebo group-title.
- **Deduplicita kanálov**: voľba, či sa duplicity majú zlučovať podľa URL, názvu, TVG-ID alebo kombinácie týchto polí.
- **Zachovanie pôvodných hodnôt**: nastavenie, ktoré uloží pôvodné `tvg-id`, `tvg-name`, `tvg-logo` a skupinu do interného snapshotu, aby bolo možné zmeny vrátiť.

## 2. EPG a TVG-ID workflow

- **Správca EPG zdrojov**: samostatný panel so zoznamom pridaných XMLTV súborov a URL zdrojov, kde bude možné zdroje zapínať, vypínať, premenovať, zmazať a zoradiť podľa priority.
- **Priorita krajiny**: nastavenie preferovaných prípon `*.sk`, `*.cz`, `*.eu`, `*.pl`, `*.uk` pri TVG-ID kandidátoch, aby sa lokálne ID uprednostnili pred zahraničnými fallbackmi.
- **Mapa TVG-ID aliasov**: používateľ môže ručne uložiť alias, napríklad `Doma HD` → `Doma.sk`, a aplikácia ho použije pri ďalších importoch.
- **EPG coverage filter**: filter kanálov bez EPG, s čiastočným EPG alebo s plným EPG pokrytím.
- **Náhľad konfliktov**: ak viac EPG zdrojov obsahuje rovnaký kanál s rôznym TVG-ID, aplikácia zobrazí porovnanie a dovolí vybrať víťazný zdroj.

## 3. Logá a vizuálne metadáta

- **Logo fallback priority**: nastaviteľné poradie zdrojov loga: pôvodný playlist, lokálny import, iptv-org API, vlastná URL, automaticky nájdený kandidát.
- **Kontrola kvality loga**: upozornenie na príliš malé, nefunkčné, priehľadné alebo duplicitné logá.
- **Režim pozadia loga**: prepínač náhľadu loga na tmavom, svetlom a transparentnom pozadí.
- **Hromadné pravidlá loga**: automatické doplnenie loga podľa TVG-ID alebo názvu pre označené kanály.

## 4. Autodetekcia a manuálne párovanie

- **Konfigurovateľné skóre zhody**: používateľ nastaví minimálnu zhodu pre automatický výber v režimoch `Bezpečný`, `Vyvážený` a `Agresívny`.
- **Vysvetlenie zhody**: pri každom návrhu zobraziť, či zhoda vznikla cez názov, TVG-ID, EPG XML, logo API alebo ručne potvrdený alias.
- **Front manuálnych rozhodnutí**: samostatný zoznam kanálov s neistou zhodou, kde používateľ prechádza návrhy jeden po druhom.
- **Učenie z potvrdení**: každé manuálne potvrdenie sa uloží ako pravidlo pre budúce importy.
- **Hromadná aplikácia podľa dôvery**: napríklad aplikovať iba návrhy nad 90 %, iba návrhy s EPG URL alebo iba návrhy zo slovenských/českých zdrojov.

## 5. Rozloženie, tabuľka a mobilné ovládanie

- **Kompaktnosť tabuľky**: režimy `Kompaktný`, `Štandardný`, `Veľký dotykový`, ktoré menia výšku riadkov, veľkosť ikon a hustotu informácií.
- **Výber viditeľných stĺpcov**: používateľ si vyberie, či chce vidieť URL, krajinu, skupinu, stav, kvalitu, TVG-ID, logo alebo EPG stav.
- **Pripnuté stĺpce**: možnosť pripnúť názov a checkbox pri horizontálnom scrollovaní.
- **Mobilný spodný action bar**: pri označených kanáloch zobraziť spodnú lištu s akciami `Autodetekcia`, `Zmazať`, `Presunúť skupinu`, `Exportovať výber`.
- **Uložené pohľady**: napríklad `Kanály bez EPG`, `Bez loga`, `SK/CZ`, `Duplicitné URL`, `Neaktívne streamy`.

## 6. Export a kompatibilita prehrávačov

- **Export profily**: predvoľby pre VLC, Kodi, TiviMate, IPTV Smarters, Enigma2 a vlastný formát.
- **Normalizácia výstupu**: nastavenie, či exportovať pôvodné názvy alebo očistené `tvg-name`.
- **Export iba aktívnych kanálov**: samostatná voľba pre export bez vypnutých alebo nefunkčných streamov.
- **Export rozdielov**: vygenerovať report zmien oproti pôvodnému importu.

## 7. Zálohy, profily a offline režim

- **Viac profilov playlistov**: samostatné knižnice pre TV, deti, šport, testovanie alebo domácnosť.
- **Lokálna záloha nastavení**: export/import JSON súboru s témou, EPG zdrojmi, aliasmi, filtrami a potvrdenými párovaniami.
- **Automatická obnova relácie**: pri návrate do aplikácie obnoviť otvorené filtre, vybraný profil a posledný import.
- **Android príprava**: nastavenia ukladať tak, aby boli kompatibilné s Capacitor Storage a neskôr použiteľné v natívnej Android aplikácii.

## Odporúčané priority implementácie

1. Správca EPG zdrojov a priorita krajiny pre TVG-ID.
2. Manuálny front neistých zhôd s učením z potvrdení.
3. Výber viditeľných stĺpcov a kompaktnosť tabuľky.
4. Export/import nastavení a aliasov.
5. Export profily pre najčastejšie IPTV prehrávače.
