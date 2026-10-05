# Zapisi izvora — Faza 1 (Istraživanje ZIS-a)

Projekat: prijava za priznanje prava na industrijski dizajn — EPS fasadni termoizolacioni panel sa unapred nanetim završnim slojem.
Datum pristupa za sve izvore: **2026-10-06** (preuzimanje obavljeno u noći 05/06. 10. 2026).
Pripremio: ZIS Istraživač (agent). Ovo je evidencija izvora, ne pravni savet.

Oznake porekla: `ČINJENICA` (šta dokument kaže), `PRAVNI ZAHTEV` (iz propisa, sa članom), `AI ZAKLJUČAK` (tumačenje agenta), `PREPORUKA`.
Lokalne kopije: `docs/izvori/dokumenti/` (originalni PDF/DOCX), `docs/izvori/web-snimci/` (HTML snimci stranica), `docs/izvori/tekst/` (izvučen tekst za pretragu). Kontrolne sume: `docs/izvori/dokumenti/SHA256SUMS.txt`.

---

## Z-01 — ZIS: Industrijski dizajn (glavna stranica)

```
naziv: Industrijski dizajn — „Kako do prijave", „Šta sve treba da znate", „Podnošenje prijave", „Postupak zaštite", FAQ
institucija: Zavod za intelektualnu svojinu Republike Srbije (ZIS)
URL: https://www.zis.gov.rs/prava/dizajn/
vrsta dokumenta: zvanična web stranica (HTML)
datum/verzija dokumenta: nije naveden na stranici (živa stranica)
datum pristupa: 2026-10-06
relevantne sekcije: „Šta sve treba da znate…", „Pre podnošenja prijave", „Podnošenje prijave", „Koje uslove dizajn mora da ispuni", „Postupak zaštite", „Koji su delovi prijave", „Kako teče postupak ispitivanja", „Kako se stiče i koliko traje pravo", „Produženje važnosti", FAQ „Da li se može naknadno izmeniti prikaz"
izdvojeni zahtevi:
  - ČINJENICA (ZIS): ne štiti se spoljašnji izgled isključivo određen tehničkom funkcijom, niti izgled koji mora biti reprodukovan u tačnom obliku i dimenzijama radi mehaničkog povezivanja sa drugim proizvodom.
  - ČINJENICA (ZIS): uslovi — novost i individualni karakter; pri individualnom karakteru uzima se u obzir stepen slobode autora i „objektivno ograničenje… prouzrokovano tehničkim i funkcionalnim karakteristikama".
  - ČINJENICA (ZIS): prijava se podnosi poštom, elektronski ili neposredno u pisarnici; NE faksom. Uređenoj prijavi dodeljuje se D-broj i datum podnošenja.
  - ČINJENICA (ZIS): uredna prijava = zahtev, opis, prikaz, punomoćje (ako postoji punomoćnik), dokaz o uplati takse; uz to po potrebi prioritetno uverenje, potvrda o izlaganju (PKS / nadležni organ), dokaz o pravnom osnovu ako autor nije podnosilac.
  - ČINJENICA (ZIS): rok za uređenje neuredne prijave „rok od mesec dana"; razlozi neurednosti „najčešće se odnose na opis ili prikaz"; ZIS upućuje na „Uputstvo o načinu sastavljanja i podnošenja prijave…" za primere opisa i prikaza.
  - ČINJENICA (ZIS): posle formalnog ispitivanja „postupak se nastavlja ispitivanjem novosti i individualnog karaktera".
  - ČINJENICA (ZIS): pravo traje 25 god. od podnošenja uz plaćanje taksi; produžava se obrascem D-7 za periode od po 5 godina.
  - ČINJENICA (ZIS): strano lice bez sedišta u RS mora imati zastupnika iz Registra zastupnika ili domaćeg advokata.
  - ČINJENICA (ZIS): pre podnošenja može se tražiti rešerš od ZIS-a (uz taksu); nacionalna baza: https://e-reg.zis.gov.rs/ords/r/zis_apex/baza_dizajna/
  - ČINJENICA (ZIS, FAQ): prikaz se ne može naknadno izmeniti tako da se bitno razlikuje od onoga određenog opisom pri podnošenju.
  - ČINJENICA: stranica navodi propise: Zakon „Sl. glasnik RS" 104/09, 45/15 i 44/18 – dr. zakoni; Uredba 43/10 i 44/2018.
značaj za naš projekat: Glavni zvanični ulaz. Potvrđuje da je tehnička funkcija (spojevi panela) izričit osnov isključenja — ključni rizik projekta. Potvrđuje da je ZIS-ovo uputstvo referentni dokument za opis i prikaz (u skladu sa e-mailom ZIS-a).
lokalna kopija: docs/izvori/web-snimci/zis-prava-dizajn.html
```

## Z-02 — ZIS: Obrasci, uputstva, primeri — Dizajn

```
naziv: Obrasci i uputstva — kategorija Dizajn
institucija: ZIS
URL: https://www.zis.gov.rs/uputstva-i-obrasci/?cat=dizajn
vrsta dokumenta: zvanična web stranica (lista dokumenata)
datum/verzija dokumenta: nije navedeno; lista sadrži D-1…D-7, MD-1, 2 uputstva, 4 primera rešerša
datum pristupa: 2026-10-06
relevantne sekcije: „Obrasci" (Obrazac D-1 MS Word 56 KB i PDF 75 KB), „Uputstva" („Sastavljanje i podnošenje prijave za priznanje prava na industrijski dizajn", PDF 274 KB), „Primeri" (rešerš po prikazu / po nosiocu)
izdvojeni zahtevi:
  - ČINJENICA: zvanični obrazac za prijavu je Obrazac D-1; dokument „Sastavljanje i podnošenje prijave…" je jedino uputstvo za nacionalnu prijavu na ovoj stranici.
  - ČINJENICA: na stranici NE postoji poseban fajl „primer BOCE" — primer BOCE je sadržan u samom Uputstvu (Z-05, str. 6–8).
  - ČINJENICA: odeljak „Primeri" sadrži samo primere zahteva za rešerš, ne primere prijava.
značaj za naš projekat: Izvor za preuzimanje D-1 i Uputstva. Obrazac D-2 (razdvajanje višestruke prijave) relevantan samo ako se podnese višestruka prijava.
lokalna kopija: docs/izvori/web-snimci/zis-uputstva-i-obrasci-dizajn.html; preuzeti fajlovi u docs/izvori/dokumenti/
```

## Z-03 — ZIS: Registar zastupnika

```
naziv: Registar zastupnika koji vodi Zavod za intelektualnu svojinu Republike Srbije (+ e-registar zastupnika)
institucija: ZIS
URL: https://www.zis.gov.rs/podrska/registar-zastupnika/ ; lista: https://e-reg.zis.gov.rs/ords/r/zis_apex/zastupnici/sr
vrsta dokumenta: zvanična web stranica + javni e-registar (APEX aplikacija)
datum/verzija dokumenta: živa stranica; e-registar prikazuje datume upisa/obnove (npr. obnove 2026)
datum pristupa: 2026-10-06
relevantne sekcije: uslovi za zastupanje; obaveza zastupanja stranih lica; tabela zastupnika (ime, profesija, adresa, kontakt, vrsta prava, status, „Koristi e-prijavu")
izdvojeni zahtevi:
  - ČINJENICA: zastupati pred ZIS-om mogu lica upisana u Registar zastupnika; uslovi upisa su u Zakonu o patentima.
  - PRAVNI ZAHTEV (Zakon o pravnoj zaštiti ind. dizajna, čl. 16): strano lice bez prebivališta/sedišta u RS mora imati zastupnika iz Registra ili domaćeg advokata.
  - AI ZAKLJUČAK: za domaćeg podnosioca zastupnik nije zakonska obaveza (zakon to propisuje samo za strana lica), ali je uz punomoćje dozvoljen (D-1 polje 2, prilog „Punomoćje").
  - ČINJENICA: e-registar je javno dostupan i automatski čitljiv; snimljena je prva strana tabele (sortirano po datumu upisa).
značaj za naš projekat: Izvor za izbor registrovanog zastupnika za proveru pre podnošenja (preporuka iz pravila projekta i iz Odluke korisnika 2026-10-05). Statusa podnosioca (domaće/strano lice) još nije potvrđen — pitanje za Intervjuera.
lokalna kopija: docs/izvori/web-snimci/zis-registar-zastupnika.html; docs/izvori/web-snimci/zis-e-reg-zastupnici.html (samo prva strana liste)
```

## Z-04 — Obrazac D-1: Zahtev za priznanje prava na industrijski dizajn

```
naziv: Obrazac D-1 — Zahtev za priznanje prava na industrijski dizajn
institucija: ZIS
URL: https://www.zis.gov.rs/wp-content/uploads/D-1-zahtev-za-priznanje-dizajn.docx ; https://www.zis.gov.rs/wp-content/uploads/D-1-zahtev-za-priznanje-prava-na-ind.dizajn-20.pdf
vrsta dokumenta: zvanični obrazac (DOCX i PDF), 2 strane
datum/verzija dokumenta: DOCX — metapodatak „modified" 2022-05-12; PDF — kreiran 2020-02-07 (PrimoPDF, naslov „D-1… 20"). Sadržaj polja 1–10 i lista priloga su istovetni u obe verzije.
datum pristupa: 2026-10-06
relevantne sekcije: zaglavlje („Zavodu za intelektualnu svojinu, Kneginje Ljubice 5, 11000 Beograd", „popuniti na računaru"); polja 1–10; „Prilozi uz zahtev"; „Popunjava Zavod" (D-broj, datum podnošenja)
izdvojeni zahtevi (ČINJENICA — polja obrasca):
  1. Poslovno ime i sedište podnosioca, odnosno ime i adresa fizičkog lica; telefon, e-mail, faks
  2. Punomoćnik (ime i adresa), odnosno zajednički predstavnik; telefon, e-mail, faks
  3. Stvaran i kratak naziv predmeta zaštite
  4. Pojedinačna (jedan predmet zaštite) / višestruka (više predmeta, navesti broj, do 100)
  5. Ime autora ako on ne podnosi prijavu, ili napomena da autor ne želi da bude naveden
  6. Pravni osnov za podnošenje ako autor nije podnosilac
  7. Zatraženo pravo prvenstva i osnov
  8. Napomena da se zahteva odloženo objavljivanje od 12 meseci
  9. Naznaka da se na određenom elementu dizajna ne traži isključivo pravo
  10. Plaćene takse (a) jedan predmet, (b) više predmeta, ukupno
  Prilozi (označiti x): dva primerka prikaza; dva primerka opisa; izjava o zajedničkom predstavniku; punomoćje; dokaz o pravu prvenstva; dokaz o uplati takse; potpis podnosioca zahteva.
  - PRAVNI ZAHTEV (Uredba 43/2010, čl. 8 st. 3): zahtev se podnosi u dva primerka.
značaj za naš projekat: Osnov za sekciju „E — D-1 vodič po poljima" (faza 2). Polje 9 (odricanje od isključivog prava na elementu) je potencijalno važno za profilisane/stepenaste ivice — AI ZAKLJUČAK, odluka ostaje za kasnije faze i zastupnika.
lokalna kopija: docs/izvori/dokumenti/D-1-zahtev-za-priznanje-dizajn.docx ; docs/izvori/dokumenti/D-1-zahtev-za-priznanje-prava-na-ind.dizajn-20.pdf ; prikaz str. 1: docs/izvori/dokumenti/D-1-pdf-str1-prikaz.png ; tekst: docs/izvori/tekst/D-1-zahtev-za-priznanje-dizajn.docx.txt
```

## Z-05 — Uputstvo „Sastavljanje i podnošenje prijave za priznanje prava na industrijski dizajn" (sa primerom BOCE)

```
naziv: Uputstvo o načinu sastavljanja i podnošenja prijave za priznanje prava na industrijski dizajn (na sajtu: „Sastavljanje i podnošenje prijave za priznanje prava na industrijski dizajn")
institucija: ZIS
URL: https://www.zis.gov.rs/wp-content/uploads/uputstvo-novo-PDF.pdf
vrsta dokumenta: zvanično uputstvo, PDF, 10 strana (ćirilica)
datum/verzija dokumenta: PDF kreiran 2016-09-21 (metapodatak); u tekstu se poziva na Zakon „Sl. glasnik RS" 104/09 i 45/15 i Uredbu 43/2010 — NE pominje izmenu 44/18
datum pristupa: 2026-10-06
relevantne sekcije:
  str. 1–2 Opšte napomene (pojam, novost, individualni karakter, isključenje tehničke funkcije, trajanje, pojedinačna/višestruka prijava)
  str. 2–3 Prijava industrijskog dizajna (obavezni delovi prijave 1–8; sadržaj zahteva D-1, tačke 1–7)
  str. 4–5 Posebne napomene I — Fotografija ili nacrt (grafički prikaz)
  str. 5–6 Posebne napomene II — Opis industrijskog dizajna; a) Opis trodimenzionalnog dizajna
  str. 6–8 Primer: BOCA (tekst opisa + 4 prikaza 1.1–1.4)
  str. 8–9 b) Opis dvodimenzionalnog dizajna; Primer: ŠARA ZA TEKSTIL
  str. 9–10 Važne napomene (minimalni elementi za upis u registar prijava; isključenja)
izdvojeni zahtevi:
  - ČINJENICA (str. 3): naziv mora biti „kratak i stvaran, A NE KOMERCIJALAN" (npr. „stona lampa", a ne „stona lampa SVETLOST").
  - ČINJENICA (str. 4): fotografije profesionalnog kvaliteta, bez podloge, ravnih uglova, na neutralnoj jednobojnoj osnovi, bez senki; nisu dozvoljene instant, retuširane, fotokopije, nepodobne za ofset.
  - ČINJENICA (str. 4): nacrti u perspektivi (aksonometrijski), mogu imati senke/senčenja radi reljefa; NE smeju biti tehnički crtež u preseku, sa osnim i kotnim linijama i dimenzijama; bez legendi/objašnjenja.
  - ČINJENICA (str. 4–5): prikaz najviše 16 × 16 cm; samo predmet zaštite, bez drugih predmeta; onoliko prikaza koliko je potrebno da se prikažu sve oblikovne karakteristike; numeracija 1.1, 1.2, … (višestruka: 2.1, 2.2 …); lepe se na beli A4, najviše 20 prikaza, margina ≥ 5 mm, ne savijati.
  - ČINJENICA (str. 5–6): opis otkucan, A4, samo jedna strana lista; sadrži podatke o podnosiocu (gore levo), naziv (gore u sredini), novost predmeta zaštite, namenu (samo ako nije jasna iz naziva), potpis; u 2 primerka.
  - ČINJENICA (str. 6): opis se odnosi samo na spoljni oblik — površine vidljive stalno ili pri redovnoj upotrebi; prvo oblik u celini, zatim delovi; opisivati „geometrijskim pojmovima"; pozivati se na brojčane oznake prikaza; NE navoditi konstrukciju, funkciju, funkcionalne prednosti, materijal.
  - ČINJENICA (str. 6–8, PRIMER BOCE) — struktura opisa: (1) šta je prijavljeno telo i namena („novo oblikovno rešenje boce za pakovanje vode"); (2) u čemu je novost („oblikovanje tela u celini… nekoliko različito oblikovanih segmenata"); (3) lista prikaza („Slika 1.1 perspektivan prikaz; 1.2 pogled sa prednje strane; 1.3 pogled sa donje strane; 1.4 pogled sa gornje strane"); (4) detaljan geometrijski opis odozdo nagore sa približnim proporcijama („približno u donje četiri devetine… cilindrično", „zarubljeni konus", „žljebovi lučnog poprečnog preseka", „polulоptasta ispupčenja"); (5) zaključna rečenica o novom ukupnom izgledu. Prikazi BOCE su senčeni prikazi bez kota i bez teksta: 1 perspektiva + 3 ortogonalna pogleda (spreda, odozdo, odozgo).
  - ČINJENICA (str. 9–10): prijava se ne upisuje u registar prijava ako ne sadrži: 2 primerka zahteva, najmanje 1 primerak prikaza, 1 primerak opisa, potpis i pečat podnosioca/punomoćnika. (Videti napomenu o neusklađenosti sa čl. 23 Zakona niže.)
  - ČINJENICA (str. 2): višestruka prijava — proizvodi iz iste klase i potklase, najviše 100 dizajna.
  - ČINJENICA (str. 3): zahtev može sadržati izjavu o odloženom objavljivanju od 12 meseci.
neusklađenosti / napomene:
  - AI ZAKLJUČAK: Uputstvo iz 2016. traži „potpis i pečat"; pečat je izmenama iz 2018. („44/18 – dr. zakon") verovatno postao neobavezan za privredna društva. NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.
  - AI ZAKLJUČAK: zahtev da fotografije budu „dobijene na osnovu negativa ili dijapozitiva" zastareo je u odnosu na digitalnu fotografiju i e-Prijavu; tehnički format digitalnih prikaza za e-podnošenje dizajna nije pronađen ni u jednom zvaničnom dokumentu (videti nedostajuci-dokumenti.md, N-01). NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.
  - AI ZAKLJUČAK: Uputstvo traži nacrte „u perspektivi", a Uredba čl. 13 zabranjuje „tehnički crtež… u projekcijama i preseku… sa osnim linijama i dimenzijama"; primer BOCE ipak sadrži ortogonalne senčene poglede. Metodologija ZIS-a (Z-08, str. 33) dopunjuje: nacrt u perspektivi „i po potrebi u projekcijama", sa senkama, ali ne kao tehnički crtež u projekcijama i preseku sa osnim/kotnim linijama i dimenzijama. Tumačenje: dozvoljeni su senčeni pogledi (spreda, odozgo, bočno), zabranjen je kotirani tehnički crtež i presek. Za stepenaste ivice to znači da se profil prikazuje bočnim pogledom/perspektivom, a ne presekom. NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.
  - ČINJENICA: Uputstvo navodi minimalne elemente za upis drugačije od čl. 23 Zakona (zakon: naznačenje da se traži pravo + podaci o podnosiocu + prikaz). Kod razlike prednost ima Zakon.
značaj za naš projekat: NAJVAŽNIJI praktični dokument — ZIS ga je izričito preporučio u e-mailu. Primer BOCE je šablon za strukturu opisa panela: celina → segmenti → geometrijski pojmovi → reference na slike → bez tehničke funkcije. Za panel to znači opisivanje oblika ivica/stepenastih profila samo kao vidljive geometrije, bez objašnjavanja spajanja (PREPORUKA za fazu izrade nacrta).
lokalna kopija: docs/izvori/dokumenti/uputstvo-novo-PDF.pdf ; prikazi BOCE: docs/izvori/dokumenti/uputstvo-str8-primer-BOCA-prikazi.png ; primer ŠARE: docs/izvori/dokumenti/uputstvo-str9-primer-SARA.png ; tekst: docs/izvori/tekst/uputstvo-novo-PDF.pdf.txt
```

## Z-06 — Zakon o pravnoj zaštiti industrijskog dizajna

```
naziv: Zakon o pravnoj zaštiti industrijskog dizajna
institucija: Narodna skupština RS; tekst preuzet sa Paragraf Lex (link na koji upućuje ZIS)
URL: https://www.paragraf.rs/propisi/zakon_o_pravnoj_zastiti_industrijskog_dizajna.html (link sa https://www.zis.gov.rs/prava/dizajn/ i https://www.zis.gov.rs/o-zavodu/dokumenta/zakoni-i-propisi/?cat=industrijski-dizajn)
vrsta dokumenta: zakon (prečišćen tekst, neslužbeni — Paragraf)
datum/verzija dokumenta: „Sl. glasnik RS", br. 104/2009, 45/2015 i 44/2018 – dr. zakon (ista oznaka verzije i na ZIS sajtu)
datum pristupa: 2026-10-06
relevantne sekcije: čl. 1–9 (pojam, novost, individualni karakter, sastavni deo složenog proizvoda, dostupnost javnosti i 12-mesečni grejs period, isključenje tehničke funkcije i must-fit, modularni izuzetak), čl. 11 (trajanje), čl. 12 (žalba), čl. 16–17 (zastupanje), čl. 18–21 (prijava, zahtev, opis, prikaz), čl. 23 (datum podnošenja), čl. 24–26 (pravo prvenstva), čl. 27 (izmena prikaza), čl. 29–31 (urednost, ispitivanje, odbijanje), čl. 33 (razdvajanje), čl. 35 (pretvaranje u prijavu patenta/malog patenta), čl. 36–38 (taksa za prvih 5 godina, upis, objavljivanje), čl. 41 (obim prava; izjava o neisključivom elementu), čl. 46 (odnos sa drugim pravima), čl. 47 (dizajn iz radnog odnosa → Zakon o patentima)
izdvojeni zahtevi (PRAVNI ZAHTEV):
  - čl. 2: dizajn = 3D ili 2D izgled celog proizvoda ili dela, određen linijama, konturama, bojama, oblikom, teksturom i/ili materijalima…
  - čl. 3–5: nov i individualni karakter; informisani korisnik; stepen slobode autora.
  - čl. 6: deo složenog proizvoda štiti se ako ostaje vidljiv tokom redovne upotrebe (redovna upotreba isključuje održavanje/servis/popravke).
  - čl. 7 st. 3: otkrivanje od strane autora/sledbenika ne uništava novost ako je od otkrivanja do podnošenja prošlo manje od 12 meseci.
  - čl. 8 st. 1: ne štiti se izgled isključivo određen tehničkom funkcijom; st. 2: ne štiti se izgled koji mora biti reprodukovan u tačnom obliku i dimenzijama radi mehaničkog povezivanja; st. 3: izuzetak za dizajn koji omogućava višestruko sastavljanje/povezivanje međusobno zamenjivih proizvoda u modularnom sistemu.
  - čl. 11: pravo traje 5 godina od podnošenja, produžava se po 5 godina, najduže 25.
  - čl. 16: strano lice — obavezan zastupnik/domaći advokat.
  - čl. 18: prijava u pisanom obliku „neposredno ili poštom"; mora sadržati zahtev, opis, dvodimenzionalni prikaz; do 100 dizajna; višestruka — ista klasa i potklasa Lokarnske klasifikacije.
  - čl. 19: sadržina zahteva; st. 2: moguće odloženo objavljivanje 12 meseci od rešenja o priznanju.
  - čl. 20: opis — precizan i sažet opis bitnih karakteristika koje dizajn čine novim; zasnovan na prikazu; bez konstrukcije, funkcije, funkcionalnih prednosti.
  - čl. 21: prikaz — spoljašnji izgled i delovi vidljivi stalno ili pri redovnoj upotrebi; moraju se jasno predstaviti svi elementi koji dizajn čine novim; fotografija ili nacrt.
  - čl. 23: datum podnošenja priznaje se ako prijava sadrži naznačenje da se traži pravo, ime/naziv i adresu podnosioca i prikaz; nedostaci — rok 30 dana.
  - čl. 25: konvencijsko pravo prvenstva — prijava u RS u roku od 6 meseci; overen prepis u roku od 3 meseca od podnošenja u RS.
  - čl. 26: sajamsko pravo prvenstva — izlaganje u roku od 3 meseca pre podnošenja; potvrda (u RS izdaje PKS).
  - čl. 27: prikaz se ne može naknadno bitno izmeniti.
  - čl. 29: rok za uređenje određuje ZIS; produženje najviše 3 meseca uz taksu; neuređena prijava se odbacuje; povraćaj u pređašnje stanje 3 meseca.
  - čl. 31: rok za izjašnjenje o razlozima odbijanja; produženje do 3 meseca.
  - čl. 35: do okončanja postupka prijava dizajna može se pretvoriti u prijavu patenta/malog patenta.
  - čl. 36: posle pozitivnog ispitivanja — taksa za prvih 5 godina + troškovi objave; neplaćanje = prijava se smatra povučenom.
  - čl. 41 st. 2: podnosilac može izjaviti da ne traži isključiva prava na elementu dizajna navedenom u opisu.
neusklađenosti / napomene:
  - ČINJENICA: čl. 18 pominje podnošenje „neposredno ili poštom", dok ZIS sajt (Z-01, Z-13) navodi i elektronsko podnošenje (e-Prijava). Elektronski kanal ZIS zvanično nudi; pravni osnov za to nije analiziran u ovoj fazi.
  - ČINJENICA: tekst je preuzet sa komercijalnog portala Paragraf (na koji ZIS linkuje). Pokušaj provere u zvaničnom Pravno-informacionom sistemu RS nije završen za ovaj zakon. NEPROVERENO – da li postoje izmene posle 44/2018 treba potvrditi u PIS-u / Službenom glasniku ili sa registrovanim zastupnikom. ZIS sajt (2026-10-06) ne navodi kasnije izmene.
značaj za naš projekat: Pravni osnov za sve zahteve. Čl. 8 (tehnička funkcija, must-fit, modularni izuzetak) direktno pogađa profilisane/stepenaste ivice panela. Čl. 6 (vidljivost tokom redovne upotrebe) je relevantan jer ivice/spojevi posle ugradnje fasade možda nisu vidljivi — AI ZAKLJUČAK, POTREBNA DODATNA PROVERA. Čl. 35 potvrđuje da su patent/mali patent poseban put.
lokalna kopija: docs/izvori/web-snimci/paragraf-zakon-o-pravnoj-zastiti-industrijskog-dizajna.html ; tekst: docs/izvori/tekst/zakon-o-pravnoj-zastiti-industrijskog-dizajna.txt
```

## Z-07 — Uredba o sadržini registra prijava i registra industrijskog dizajna…

```
naziv: Uredba o sadržini registra prijava i registra industrijskog dizajna, sadržini zahteva koji se podnose u postupku za priznanje i zaštitu prava na industrijski dizajn i podacima koji se objavljuju u službenom glasilu nadležnog organa
institucija: Vlada RS; tekst sa Paragraf Lex (link sa ZIS sajta)
URL: https://www.paragraf.rs/propisi/uredba_o_sadrzini_registra_prijava_i_registra_industrijskog_dizajna.html
vrsta dokumenta: podzakonski akt (uredba) — jedini podzakonski akt za dizajn koji ZIS navodi; poseban „pravilnik" za dizajn nije naveden na ZIS listi propisa
datum/verzija dokumenta: „Sl. glasnik RS", br. 43/2010 i 44/2018 – dr. zakon (ZIS: 43/10 od 25.06.2010. i 44/2018 od 08.06.2018.)
datum pristupa: 2026-10-06
relevantne sekcije: čl. 8 (sadržina zahteva, 2 primerka), čl. 9 (prilozi), čl. 10 (opis), čl. 11 (tehničke karakteristike prikaza), čl. 12 (fotografije), čl. 13 (nacrt), čl. 14–15 (uverenje o pravu prvenstva), čl. 16–17 (razdvajanje)
izdvojeni zahtevi (PRAVNI ZAHTEV):
  - čl. 8: zahtev sadrži 11 elemenata (podnosilac; punomoćnik; zajednički predstavnik; naziv; autor ili izjava; pravo prvenstva; pravni osnov; odloženo objavljivanje; element bez isključivog prava; podatak o taksi; potpis i pečat podnosioca ili punomoćnika*); podnosi se u dva primerka.
  - čl. 9: prilozi — opis; prikaz; punomoćje; overen prepis (čl. 25); potvrda (čl. 26); izjava autora da ne želi da bude naveden; izjava o osnovu sticanja prava ako autor nije podnosilac; izjava o zajedničkom predstavniku; dokaz o uplati takse.
  - čl. 10: opis u 2 istovetna primerka; „u izdvojenom stavu" naznačene karakteristike kojima se određuje novost i obim zaštite; A4; podaci o podnosiocu (gore levo), naziv (gore sredina), novost, namena (ako nije jasna iz naziva), potpis; za svaki predmet poseban opis.
  - čl. 11: prikaz u 2 istovetna primerka (jedan zalepljen/unet na A4 uz zahtev, drugi odvojeno); samo predmet zaštite — bez drugog predmeta, pripatka, lica ili životinje; fotografija ili nacrt najviše 16 × 16 cm; numeracija 1.1, 1.2…; na zahtevu numeracija na licu, na drugom primerku na poleđini; najviše 20 prikaza po strani; margina ≥ 5 mm.
  - čl. 12: fotografije — profesionalne, neutralna jednobojna osnova, bez senki; zabrane (instant, retuš, fotokopija, nepodobno za ofset).
  - čl. 13: nacrt — u perspektivi, dozvoljene senke/senčenja; zabranjen tehnički crtež u projekcijama i preseku, osne linije i dimenzije, legende.
napomene:
  - ČINJENICA: čl. 8 tač. 11 i čl. 16 tač. 9 nose zvezdicu (*) — izmenjeni su aktom 44/2018. Izmenjen tekst na Paragrafu i dalje glasi „potpis i pečat". NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom da li je pečat obavezan.
  - ČINJENICA: čl. 10 st. 2 („u izdvojenom stavu… karakteristike… kojima se određuje novost i obim zaštite") nema ekvivalent u primeru BOCE kao zasebno označen stav — AI ZAKLJUČAK: završni pasus primera BOCE vrši tu ulogu; potrebno uskladiti u fazi izrade nacrta.
značaj za naš projekat: Najprecizniji izvor tehničkih zahteva za prikaz i opis (formati, broj primeraka, numeracija). Uz Z-05 osnov za sekcije C i D faze 2.
lokalna kopija: docs/izvori/web-snimci/paragraf-uredba-43-2010.html ; tekst: docs/izvori/tekst/uredba-43-2010.txt
```

## Z-08 — Metodologija postupanja ZIS-a za industrijski dizajn (+ Aneks I)

```
naziv: Metodologija postupanja Zavoda za intelektualnu svojinu u postupku za priznanje prava na industrijski dizajn i u postupcima po registrovanim industrijskim dizajnima; Aneks I — CP10 „Disclosure of Designs on the Internet" (SR, sa komentarima ZIS-a)
institucija: ZIS (Aneks I: zajednička praksa EUIPN/EUIPO, prilagođena od ZIS-a)
URL: https://www.zis.gov.rs/wp-content/uploads/metodologija-dizajn-2012.pdf ; https://www.zis.gov.rs/wp-content/uploads/CP10-Disclosure-of-Designs-on-the-Internet_SR-IPORS-comments-EUIPO-min.pdf
vrsta dokumenta: smernice ispitivača (javno dostupne), PDF
datum/verzija dokumenta: Metodologija — PDF kreiran 2012-07-06, 91 strana (zasnovana na Zakonu 104/09 i Uredbi 43/2010 — pre izmena 45/15 i 44/18); Aneks I — PDF 2023-10-23, 45 strana
datum pristupa: 2026-10-06
relevantne sekcije / izdvojeni zahtevi / značaj: detaljan izvod sa brojevima strana u docs/izvori/metodologija-izvod.md
napomena: AI ZAKLJUČAK — Metodologija iz 2012. prethodi izmenama Zakona iz 2015. i 2018; gde se razlikuje od važećeg teksta Zakona, prednost ima Zakon.
lokalna kopija: docs/izvori/dokumenti/metodologija-dizajn-2012.pdf ; docs/izvori/dokumenti/CP10-Disclosure-of-Designs-on-the-Internet_SR-IPORS-comments-EUIPO-min.pdf ; tekst: docs/izvori/tekst/
```

## Z-09 — ZIS: Takse (industrijski dizajn)

```
naziv: Takse — Industrijski dizajn
institucija: ZIS (iznosi iz Tarife republičkih administrativnih taksi)
URL: https://www.zis.gov.rs/prava/takse/ (odeljak „Industrijski dizajn")
vrsta dokumenta: zvanična web stranica (tabela taksi)
datum/verzija dokumenta: stranica sadrži napomenu „Novi usklađeni dinarski iznosi… stupili su na snagu 1. jula 2026." — iznosi u tabeli za dizajn odgovaraju „Sl. glasniku RS" 54/2026 (videti Z-10)
datum pristupa: 2026-10-06
relevantne sekcije: Tar. br. 107 (prijava), 108 (razdvajanje), 109 (rezultat ispitivanja), 115 (sticanje/održavanje 5 god.), 119–123, 128 (hitni postupak), 129 (pretvaranje patent↔dizajn), 134l (rešerš po prikazu), 134lj (rešerš po imenu); uputstvo za uplatu
izdvojeni zahtevi (ČINJENICA — iznosi u RSD; kolona „Taksa" / kolona „Taksa za fizička lica"):
  - Tar. br. 107 — prijava, jedan dizajn: 8.540 / 4.270
  - Tar. br. 107 — za drugi i svaki sledeći dizajn u višestrukoj prijavi: 6.410 / 3.205
  - Elektronski podneta prijava dizajna: umanjenje 25% od propisane takse (napomena ZIS-a; tačan iznos — ZIS kalkulator taksi)
  - Tar. br. 109 — rezultat ispitivanja: 1.040 / 520 (dokaz uz odgovor na rezultat ispitivanja)
  - Tar. br. 115 — sticanje/održavanje za 5 godina: prvi dizajn 21.390 / 10.695; drugi i svaki sledeći iz serije 14.950 / 7.475; za 6.–25. godinu po petogodištu: prvi 12.820 / 6.410, sledeći 8.540 / 4.270. Plaća se do početka godine za koju se plaća, najranije 6 meseci pre isteka; naknadno u roku od 6 meseci uz uvećanje 50%.
  - Tar. br. 123 — isprava o priznatom pravu: 4.290 / 2.145
  - Tar. br. 122 — produženje roka: prvi zahtev do 30 dana 2.160 / 1.080; svaki sledeći mesec 3.200 / 1.600
  - Tar. br. 108 — razdvajanje višestruke prijave: 3.200 / 1.600 po prijavi (e-podnošenje −25%)
  - Tar. br. 128 — prijava preko reda: 10.660 / 5.330
  - Tar. br. 134l — rešerš po prikazu: 4.210; Tar. br. 134lj — rešerš po imenu: 4.210
  - Uplata: račun 840-30880845-62, poziv na broj 97 2801864040, primalac „Republičke administrativne takse – Zavod za intelektualnu svojinu"; u svrsi uplate navesti tarifni broj i broj prijave ako postoji.
  - Kolona „Taksa za fizička lica": prema napomeni ZIS-a primenjuje se kad su SVI podnosioci fizička lica.
napomene:
  - NEPROVERENO: iznos „troškova objave" (Zakon čl. 36) za dizajn nije prikazan na stranici taksi — videti nedostajuci-dokumenti.md, N-02.
  - NEPROVERENO: da li se umanjenje za e-podnošenje (−25%) i umanjenje za fizička lica kumuliraju — potrebno proveriti ZIS kalkulatorom taksi (https://www.zis.gov.rs/kalkulator-taksi/) ili kod ZIS-a.
značaj za naš projekat: Osnov za sekciju G (Takse) u fazi 2. Za pojedinačnu prijavu pravnog lica, papirno: 8.540 RSD pri podnošenju; pri priznanju 21.390 + 4.290 (isprava) + troškovi objave (NEPROVERENO).
lokalna kopija: docs/izvori/web-snimci/zis-takse.html ; tekst: docs/izvori/tekst/zis-takse.txt
```

## Z-10 — Usklađeni dinarski iznosi iz Tarife republičkih administrativnih taksi („Sl. glasnik RS" 54/2026)

```
naziv: Usklađeni dinarski iznosi iz Tarife republičkih administrativnih taksi
institucija: Vlada RS; objavljeno u „Službenom glasniku RS", br. 54 od 19. juna 2026; izvor: Pravno-informacioni sistem RS (zvanični)
URL: https://pravno-informacioni-sistem.rs/eli/rep/sgrs/vlada/iznos/2026/54/1 (link sa stranice ZIS taksi)
vrsta dokumenta: službeni akt (usklađeni iznosi), HTML aplikacija (renderovano headless pregledačem)
datum/verzija dokumenta: „Sl. glasnik RS" 54/2026 od 19.06.2026; primena od 1.7.2026 (prema napomeni ZIS-a)
datum pristupa: 2026-10-06
relevantne sekcije: tačka 119) Tar. br. 107 (stav 9. tač. 1–2), 121) Tar. br. 109, 127) Tar. br. 115, 135) Tar. br. 123, 160) Tar. br. 134l
izdvojeni zahtevi (ČINJENICA): Tar. br. 107 st. 9 tač. 1) 8.540; tač. 2) 6.410; Tar. br. 109 1.040; Tar. br. 115 st. 1 tač. 1) 21.390, tač. 2) 14.950, st. 2 tač. 1) 12.820, tač. 2) 8.540; Tar. br. 123 st. 1 4.290; Tar. br. 134l 4.210 — svi se poklapaju sa ZIS tabelom (Z-09).
napomena: AI ZAKLJUČAK — povezivanje „Tar. br. 107 st. 9" sa prijavom dizajna zasnovano je na ZIS tabeli i istovetnim iznosima; sam tekst Tarife (Zakon o republičkim administrativnim taksama) nije posebno preuzet.
značaj za naš projekat: Potvrda da su iznosi na ZIS sajtu aktuelni na dan pristupa. Iznosi se usklađuju godišnje (sledeće usklađivanje očekivano sredinom 2027) — proveriti pre uplate (PREPORUKA).
lokalna kopija: docs/izvori/web-snimci/pis-sg-54-2026-uskladjeni-iznosi-taksi.html ; tekst: docs/izvori/tekst/sg-54-2026-uskladjeni-iznosi-taksi.txt
```

## Z-11 — Lokarnska klasifikacija (WIPO LOCPUB), klasa 25

```
naziv: International Classification for Industrial Designs (Locarno Classification) — Class 25 „Building units and construction elements"
institucija: WIPO
URL: https://locpub.wipo.int/enfr/?class_number=25&lang=en&menulang=en&mode=flat&version=20250101 (LOC 15, na snazi) ; isto sa version=20270101 (LOC 16) ; vest: https://www.wipo.int/en/web/classification-locarno/w/news/2025/locarno-classification-16th-edition-advance-publication-now-available
vrsta dokumenta: zvanična međunarodna klasifikacija (online publikacija LOCPUB v4.0.2, poslednja izmena 2026.08.06)
datum/verzija dokumenta: LOC (15) na snazi od 1.1.2025; LOC (16) objavljena unapred 26.2.2026, stupa na snagu 1.1.2027
datum pristupa: 2026-10-06
relevantne sekcije: 25-01 BUILDING MATERIALS (napomena: „Including bricks, beams, pre-shaped strips, tiles, slates and panels"); 25-02 PREFABRICATED OR PRE-ASSEMBLED BUILDING PARTS
izdvojeni zahtevi:
  - PRAVNI ZAHTEV (Zakon čl. 18 st. 5): kod višestruke prijave svi proizvodi u istoj klasi i potklasi.
  - ČINJENICA (LOC 15 i LOC 16, istovetno): u 25-01 postoje pojmovi „Wall panels" (105283), „Insulating materials for building" (105282), „Decorative panels for building" (103994), „Linings for building / Cladding for building" (103976), „Panelling [building]" (103968); u 25-02 postoji pojam „Insulated building panels" (104823).
  - ČINJENICA: ZIS stranica „Baze podataka" i dalje pominje 13. izdanje Lokarnske klasifikacije — zastarela informacija u odnosu na WIPO.
  - AI ZAKLJUČAK: kandidat potklase je 25-01 (panel kao građevinski materijal / zidna obloga) ili 25-02 (izolovani građevinski panel kao montažni element). Ne može se pouzdano odabrati bez potvrde. NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom (klasu u registar unosi ZIS; D-1 nema polje za klasu).
  - AI ZAKLJUČAK: ako se prijava podnese posle 1.1.2027, primenjuje se LOC 16; relevantni pojmovi su isti.
značaj za naš projekat: Određuje grupu za pretragu postojećih dizajna (faza pretrage) i, kod višestruke prijave, da li varijante panela mogu u istu prijavu.
lokalna kopija: docs/izvori/web-snimci/wipo-locpub-klasa25-LOC15.html ; docs/izvori/web-snimci/wipo-locpub-klasa25-LOC16.html ; docs/izvori/web-snimci/wipo-loc16-vest.html ; tekst: docs/izvori/tekst/locarno-LOC15-klasa25.txt, locarno-LOC16-klasa25.txt
```

## Z-12 — ZIS: Baze podataka — Dizajn (baza industrijskih dizajna)

```
naziv: Baze podataka — Dizajn (Baza podataka industrijskih dizajna, Hague Express, Klasifikacije, DesignView)
institucija: ZIS
URL: https://www.zis.gov.rs/baze-podataka/dizajn/ ; baza: https://e-reg.zis.gov.rs/ords/r/zis_apex/baza_dizajna/
vrsta dokumenta: zvanična web stranica + e-registar (APEX)
datum/verzija dokumenta: živa stranica; podaci „svakodnevno ažurirani"
datum pristupa: 2026-10-06
relevantne sekcije: opis baze; link na Lokarnsku klasifikaciju (WIPO)
izdvojeni zahtevi: ČINJENICA — baza sadrži dizajne i prijave podnete ili registrovane u ZIS-u; isti podaci dostupni u DesignView. Automatski zahtev ka bazi preusmerava na stranicu sesije („login?session=…"); stranica se učitava, ali pretraga zahteva interaktivni rad u pregledaču.
značaj za naš projekat: Obavezni izvor za kasniju fazu pretrage postojećih dizajna (nije deo ove faze). Zabeleženo samo da je baza dostupna.
lokalna kopija: docs/izvori/web-snimci/zis-baze-podataka-dizajn.html
```

## Z-13 — ZIS: e-Prijava (elektronsko podnošenje) + korisničko uputstvo

```
naziv: Elektronsko podnošenje prijava i podnesaka; „Korisničko uputstvo ZIS e-Prijava" (2018)
institucija: ZIS
URL: https://www.zis.gov.rs/e-prijava/ ; https://www.zis.gov.rs/wp-content/uploads/UPUTSTVO-ZIS-e-Prijava-2018.pdf
vrsta dokumenta: zvanična web stranica + PDF uputstvo (33 strane)
datum/verzija dokumenta: stranica živa (pominje izmene od 12.8.2025); uputstvo iz 2018
datum pristupa: 2026-10-06
relevantne sekcije: tehnički preduslovi; koraci podnošenja; „Kada je prijava podneta"; plaćanje
izdvojeni zahtevi (ČINJENICA):
  - potreban kvalifikovani sertifikat za elektronski potpis (JP Pošta, PKS, MUP lična karta, Halcom, E-Smart) i Java;
  - e-prijava podneta radnim danom do 15:30 smatra se podnetom istog dana; posle 15:30 ili neradnim danom — prvog narednog radnog dana;
  - e-podnošenje daje umanjenje takse (za dizajn −25%, Z-09);
  - uputstvo iz 2018. daje tehničke zahteve za sliku ŽIGA (JPEG, do 2 MB), ali NE i za prikaz industrijskog dizajna.
značaj za naš projekat: Način podnošenja (sekcija H faze 2) i trenutak sticanja datuma podnošenja. Tehnički format digitalnog prikaza dizajna ostaje nepoznat (N-01).
lokalna kopija: docs/izvori/web-snimci/zis-e-prijava.html ; docs/izvori/dokumenti/UPUTSTVO-ZIS-e-Prijava-2018.pdf
```

## Z-14 — ZIS: Primer zahteva za rešerš industrijskog dizajna na osnovu prikaza proizvoda

```
naziv: Zahtev za pretraživanje baza podataka za industrijski dizajn (primer)
institucija: ZIS
URL: https://www.zis.gov.rs/wp-content/uploads/primer-resersa-dizajna-po-prikazu-proizvoda-02-2025.pdf
vrsta dokumenta: zvanični primer zahteva, PDF, 1 strana
datum/verzija dokumenta: 02-2025 (PDF kreiran 2025-02-06)
datum pristupa: 2026-10-06
relevantne sekcije: ceo dokument
izdvojeni zahtevi: ČINJENICA — zahtev sadrži naziv proizvoda (obavezno), prikaze proizvoda u prilogu, dokaz o uplati takse po Tar. br. 134l; ZIS dostavlja izveštaj da li postoji raniji identičan dizajn za teritoriju RS.
značaj za naš projekat: Opcija za fazu pretrage (ZIS rešerš kao dopuna sopstvenoj pretrazi baze ZIS-a). PREPORUKA za razmatranje u fazi pretrage.
lokalna kopija: docs/izvori/dokumenti/primer-resersa-dizajna-po-prikazu-proizvoda-02-2025.pdf
```

## Z-15 — Dopunski ZIS dokumenti (preuzeti, ograničen značaj za ovu fazu)

```
naziv: Obrazac D-2 (razdvajanje višestruke prijave); „Postupak međunarodne zaštite industrijskog dizajna" (12-08-2025)
institucija: ZIS
URL: https://www.zis.gov.rs/wp-content/uploads/D2-Zahtev-za-razdvajanje-visestruke-prijave-industrijskog-dizajna.pdf ; https://www.zis.gov.rs/wp-content/uploads/uputstvo-o-postupku-medjunarodne-zastite-industrijskog-dizajna-12-08-2025-min.pdf
vrsta dokumenta: obrazac; uputstvo (9 strana)
datum/verzija dokumenta: D-2 bez datuma; uputstvo 12.08.2025
datum pristupa: 2026-10-06
relevantne sekcije: —
izdvojeni zahtevi: ČINJENICA — međunarodna registracija (Haški sistem) ide preko ZIS-a i van je obima nacionalne prijave.
značaj za naš projekat: Nizak u ovoj fazi; relevantno samo ako korisnik kasnije traži zaštitu van Srbije (pitanje za Intervjuera).
lokalna kopija: docs/izvori/dokumenti/D2-Zahtev-za-razdvajanje-visestruke-prijave-industrijskog-dizajna.pdf ; docs/izvori/dokumenti/uputstvo-o-postupku-medjunarodne-zastite-industrijskog-dizajna-12-08-2025-min.pdf
```
