# Ďalšie funkcie pre EPG, logá a TVG metadáta

Tento dokument dopĺňa roadmapu o špecializované funkcie zamerané na kvalitu EPG, log, TVG-ID a TVG-Name. Cieľom je znížiť manuálne opravy po importe playlistu a spraviť z aplikácie nástroj na priebežnú údržbu IPTV knižnice.

## 1. EPG Coverage Dashboard

Prehľad pokrytia EPG pre celý playlist:

- percento kanálov s TVG-ID,
- percento kanálov s priradenou TVG URL,
- počet kanálov bez dnešného programu,
- krajiny EPG zdrojov (`.sk`, `.cz`, `.pl`, `.uk`, ...),
- zoznam rizikových krížových priradení.

## 2. EPG Timeline Preview

Pri každom kanáli zobraziť krátky časový náhľad:

- aktuálny program,
- nasledujúce 2–3 relácie,
- indikátor, či EPG dáta nie sú posunuté časovo,
- rýchle porovnanie viacerých EPG kandidátov.

## 3. EPG kandidáti a riešenie konfliktov

Ak existuje viac EPG kandidátov pre jeden kanál, aplikácia zobrazí poradie:

1. presné TVG-ID `.sk`,
2. presné TVG-ID `.cz`,
3. alias z ručne potvrdenej mapy,
4. názvová zhoda,
5. ostatné krajiny ako varovanie.

Používateľ môže kandidáta potvrdiť a uložiť ako trvalé pravidlo.

## 4. TVG-ID canonical dictionary

Lokálny slovník známych CZ/SK kanálov:

- aliasy názvov,
- kanonické TVG-ID,
- preferovaná krajina,
- známe logá,
- známe EPG URL.

Slovník by sa dal exportovať/importovať, aby používateľ vedel zdieľať opravené mapovania.

## 5. TVG-Name normalizačné pravidlá

Pravidlá na automatické čistenie TVG-Name:

- odstránenie `HD`, `FHD`, `4K`, provider suffixov a symbolov,
- zachovanie značiek, ktoré sú súčasťou názvu,
- prepis podľa kanonického slovníka,
- ukážka pred/po ešte pred aplikovaním.

## 6. Logo Quality Checker

Kontrola kvality loga:

- neplatná URL,
- príliš malý obrázok,
- priehľadné logo na nevhodnom pozadí,
- pomer strán mimo očakávania,
- duplicitné logo pri viacerých kanáloch,
- fallback na textové iniciály iba ako posledná možnosť.

## 7. Logo Source Ranking

Pri viacerých logách pre rovnaký kanál vybrať najlepší zdroj podľa priorít:

1. ručne potvrdené logo,
2. oficiálne logo z kanonického slovníka,
3. iptv-org API,
4. logo z M3U playlistu,
5. externý fallback.

## 8. Logo Background Preview

Náhľad loga na rôznych pozadiach:

- tmavé pozadie,
- svetlé pozadie,
- transparentný podklad,
- malá ikona v tabuľke,
- veľké logo v detaile kanála.

Používateľ tak uvidí, či logo nie je nečitateľné.

## 9. Bulk Metadata Rules

Hromadné pravidlá pre úpravu metadát:

- `ak TVG-ID končí .pl a existuje .sk/.cz, použi .sk/.cz`,
- `ak TVG-Name obsahuje ©/Ⓢ/HD suffix, odstráň`,
- `ak logo chýba, hľadaj podľa kanonického TVG-ID`,
- `ak EPG URL chýba, doplň z preferovaného indexu`.

## 10. Metadata Health Report

Exportovateľný report kvality:

- CSV/JSON výstup,
- počet opravených polí,
- kanály bez loga,
- kanály bez EPG,
- kanály s podozrivou krajinou,
- odporúčané ďalšie kroky.

## Navrhované poradie implementácie

1. TVG-ID canonical dictionary.
2. EPG kandidáti a riešenie konfliktov.
3. Logo Quality Checker.
4. EPG Coverage Dashboard.
5. Bulk Metadata Rules.
6. Metadata Health Report.
