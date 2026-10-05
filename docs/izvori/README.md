# Izvori — Faza 1: Istraživanje ZIS-a

Evidencija zvaničnih izvora za prijavu za priznanje prava na industrijski dizajn (EPS fasadni panel). Datum pristupa: 2026-10-06.

## Sadržaj

| Fajl / folder | Šta sadrži |
|---|---|
| `zapisi-izvora.md` | Zapis za svaki izvor (Z-01 … Z-15) u propisanom formatu |
| `metodologija-izvod.md` | Izvod iz Metodologije ZIS-a za dizajn (2012) i CP10, sa brojevima strana |
| `nedostajuci-dokumenti.md` | Dokumenti koji nisu dostupni (N-01, N-02) i otvorene provere (P-01 … P-05) |
| `dokumenti/` | Originalni PDF/DOCX sa ZIS sajta + prikazi strana; `SHA256SUMS.txt` (provera: iz `docs/izvori/` pokrenuti `shasum -a 256 -c dokumenti/SHA256SUMS.txt`) |
| `web-snimci/` | HTML snimci analiziranih stranica (ZIS, Paragraf, PIS, WIPO) |
| `tekst/` | Izvučen tekst dokumenata (za pretragu i proveru citata) |

## Kriterijumi zatvaranja faze 1

| # | Kriterijum | Status | Gde |
|---|---|---|---|
| 1 | Analizirana sva tri ZIS linka | ✅ | Z-01, Z-02, Z-03 |
| 2 | Aktuelni obrazac D-1 pronađen i lokalno sačuvan | ✅ DOCX (2022) + PDF (2020), polja istovetna | Z-04 |
| 3 | „Sastavljanje i podnošenje prijave…" preuzeto i analizirano | ✅ (PDF iz 2016) | Z-05 |
| 4 | Primer BOCE pronađen i analiziran (opis + prikazi) | ✅ Uputstvo, str. 6–8; 4 prikaza 1.1–1.4 | Z-05 |
| 5 | Zakon i podzakonski akti evidentirani sa službenim glasnikom | ✅ Zakon 104/09, 45/15, 44/18 – dr. zakon; Uredba 43/2010, 44/2018; Metodologija; izmene posle 2018: P-01 | Z-06, Z-07, Z-08 |
| 6 | Aktuelne takse evidentirane | ✅ iznosi od 1. 7. 2026 (SG 54/2026); troškovi objave nedostaju — N-02 | Z-09, Z-10 |
| 7 | Lokarnska klasifikacija evidentirana | ⚠️ klasa 25 potvrđena; potklasa 25-01 / 25-02 NEPROVERENA (P-03) | Z-11 |
| 8 | Kompletan zapis za svaki izvor | ✅ | `zapisi-izvora.md` |

Matrica zahteva i „Rezultati inicijalnog istraživanja" (A–N) su faza 2 i ovde nisu rađeni.
