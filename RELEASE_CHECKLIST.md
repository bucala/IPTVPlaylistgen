# Release Checklist

Pouzi tento checklist pred kazdym vydanim web/PWA, Electron alebo Android verzie.

## Pred release

- [ ] Skontrolovat, ze `package.json`, `package-lock.json`, Android `versionName` a `versionCode` maju spravnu verziu.
- [ ] Spustit `npm install --package-lock-only --ignore-scripts`, ak sa menili dependency alebo verzia balika.
- [ ] Spustit `npm run sync:www`.
- [ ] Spustit `npm test`.
- [ ] Spustit `npm audit`.
- [ ] Rucne prejst hlavne workflow: import suboru, import URL, editacia kanala, autodetect, export M3U, export XSPF.
- [ ] Skontrolovat PWA refresh po zmene `sw.js` cache nazvu.

## Web/PWA

- [ ] Overit, ze `_headers` a `_redirects` su nasadene hostingom.
- [ ] Overit, ze `index.html` a `sw.js` maju `no-cache` hlaviscky.
- [ ] Otestovat offline fallback po prvom nacitani.
- [ ] Otestovat, ze playlist/EPG URL sa necachuju.

## Electron

- [ ] Spustit `npm run win:start`.
- [ ] Otestovat hlavne workflow v desktop okne.
- [ ] Spustit `npm run win:build`.
- [ ] Overit, ze aplikacia startuje z vygenerovaneho portable/installer vystupu.

## Android

- [ ] Spustit `npm run android:sync`.
- [ ] Otvorit Android Studio cez `npm run android:open`.
- [ ] Overit, ze app label, package id a ikony sedia.
- [ ] Spustit debug build na zariadeni alebo emulatore.
- [ ] Otestovat hlavne workflow v Android WebView.

