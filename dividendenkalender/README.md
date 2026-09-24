# Dividendenkalender

Übersicht über erwartete Dividendenzahlungen pro Monat – im Browser, ohne Abhängigkeiten (HTML, CSS, Vanilla JavaScript).

## Starten

`index.html` in einem Browser öffnen.

## Funktionen

- DAX-40-Liste (Stand Sept. 2026) mit Richtwerten für Dividende und Zahlmonat, durchsuchbar, per Klick ins Formular übernehmbar (`dax.js`)
- Positionen erfassen: Name/Ticker, Stückzahl, Dividende je Aktie und Zahlung, Zahltag, Zahlungsmonate
- Schnellauswahl: monatlich, quartalsweise, halbjährlich, jährlich (ab dem ersten angehakten Monat)
- Kalender mit 12 Monaten, Summe und Balken je Monat, aktueller Monat hervorgehoben
- Jahressumme brutto/netto und Ø pro Monat, Steuersatz einstellbar (Standard 26,375 % inkl. Soli)
- Positionen bearbeiten und löschen
- Speicherung im Browser (localStorage), Export/Import als JSON
