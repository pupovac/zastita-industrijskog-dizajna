## Banka pitanja A–G i uzorni odgovori — fasadni termoizolacioni panel sa profilisanim spojem i integrisanim završnim slojem

Verzija 1.0 · 2026-10-25 · Intervjuer (FUZZ-143). Proizvod (IZJAVA KORISNIKA): „Termoizolacioni fasadni panel sa profilisanim spojem i integrisanim završnim slojem.“

### Kako čitati

- Svaki `exampleAnswer` je ŠABLON ZA POPUNJAVANJE, pisan kao da ga daje podnosilac ovog panela. Ništa u njemu nije tvrdnja o stvarnom proizvodu (sourceType: AGENT_INFERENCE).
- Oznake u uglastim zagradama `[…]` su mesta koja podnosilac mora da zameni svojim podatkom ili da obriše. Odgovor sa preostalim oznakama ne sme da postane POTVRĐENA ČINJENICA KORISNIKA.
- Gde šablon nudi `/ Alternativa:`, podnosilac zadržava samo onu verziju koja važi za njegov proizvod.
- `includeHints` = šta obavezno pomenuti; `avoidHints` = šta ne pisati jer ne ulazi u opis industrijskog dizajna (MZ-040 – MZ-049) ili je patentna terminologija.
- `whyNeeded` upućuje na Matricu zahteva ZIS-a (`docs/faza-2/matrica-zahteva-zis.json`) oznakama MZ-xxx / NS-xx.
- Odgovori iz grupe E služe analizi tehničke funkcije (faza 4) i NE ulaze u tekst opisa. Odgovori iz grupa A, B, F i G idu u obrazac D-1, priloge i strategiju zaštite, ne u opis.
- Predmet je „prijava za priznanje prava na industrijski dizajn“. Izraz „patentiranje industrijskog dizajna“ se ne koristi.

### Predložene oznake elemenata (PREPORUKA, konačno određuje Pisac Prijave)

| Oznaka | Element |
|---|---|
| (1) | prednja površina sa završnim slojem |
| (2) | zadnja površina |
| (3) | duže ivice — (3a) gornja, (3b) donja |
| (4) | kraće ivice — (4a) leva, (4b) desna |
| (5) | profil spoja (stepenik / prag na ivici) |
| (6) | prelaz završnog sloja ka ivici (vidljiva traka sloja na ivici) |
| (7) | ugaoni, početni ili završni element — samo ako postoji |

### Pregled

| Grupa | Naslov | Pitanja | Obavezna | Visok prioritet |
|---|---|---|---|---|
| A | Podnosilac prijave | 4 | 4 | 0 |
| B | Autor / dizajner | 3 | 3 | 0 |
| C | Proizvod | 5 | 5 | 0 |
| D | Vizuelne karakteristike | 15 | 15 | 0 |
| E | Profil za spajanje panela | 7 | 7 | 0 |
| F | Varijante proizvoda | 3 | 2 | 0 |
| G | Prethodno javno objavljivanje — VISOK PRIORITET | 4 | 4 | 4 |
| **Ukupno** | | **41** | **40** | **4** |

---

## Grupa A — Podnosilac prijave

_Podaci koji idu u obrazac D-1 (polja 1 i 2) i određuju taksu, zastupanje i način podnošenja. Ne ulaze u opis dizajna._

### A1 · `A1_APPLICANT_TYPE` · obavezno

**PITANJE**
Da li je podnosilac prijave fizičko lice, preduzetnik ili privredno društvo? Ako podnosilaca ima više, ko su i da li su svi fizička lica?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Određuje polje 1 obrasca D-1, visinu takse (kolona za fizička lica važi samo ako su svi podnosioci fizička lica) i da li je potreban zajednički predstavnik (MZ-080, MZ-082, MZ-145, MZ-146).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Podnosilac je jedno privredno društvo: [puno poslovno ime, npr. „XY d.o.o. Beograd“]. Drugih podnosilaca nema. Društvo u poslovanju [koristi / ne koristi] pečat. / Alternativa: Podnosilac sam ja kao fizičko lice, [ime i prezime]; drugih podnosilaca nema. / Alternativa: Podnosioca su dva: [ime 1] (fizičko lice) i [naziv firme] (privredno društvo), pa nisu svi fizička lica.

**OBAVEZNO POMENITE**
- pravni oblik podnosioca: fizičko lice, preduzetnik, d.o.o. ili drugo
- broj podnosilaca; ako ih je više, navedite svakog
- ako ih je više: da li su baš svi fizička lica (utiče na taksu)
- da li podnosilac pravno lice koristi pečat (otvoreno pitanje NS-08)

**NE PIŠITE**
- ne navodite skraćeni ili komercijalni naziv umesto registrovanog poslovnog imena
- ne navodite firmu koja još nije osnovana kao podnosioca (vidi A3)
- ne mešajte podnosioca sa autorom — autor je grupa B

### A2 · `A2_APPLICANT_DETAILS` · obavezno

**PITANJE**
Navedite tačne podatke podnosioca kako treba da stoje u prijavi: poslovno ime i sedište (ili ime, prezime i adresa prebivališta), telefon i e-mail.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ovi podaci idu u polje 1 obrasca D-1 i spadaju u zakonski minimum za priznanje datuma podnošenja (MZ-003, MZ-146).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Poslovno ime: [tačno kao u registru APR-a]. Sedište: [ulica i broj], [poštanski broj] [mesto], Republika Srbija. Matični broj: [MB], PIB: [PIB]. Osoba za kontakt: [ime i prezime, funkcija]. Telefon: [+381 …]. E-mail: [adresa]. / Alternativa za fizičko lice: [ime i prezime], [ulica i broj], [poštanski broj] [mesto], JMBG [samo ako ga D-1 traži], telefon [+381 …], e-mail [adresa].

**OBAVEZNO POMENITE**
- puno ime tačno kao u registru (APR) ili ličnom dokumentu
- puna adresa sedišta ili prebivališta, sa poštanskim brojem i državom
- telefon i e-mail na kojima ZIS može da vas dobije
- matični broj i PIB ako je podnosilac firma
- ime osobe za kontakt ako je podnosilac firma

**NE PIŠITE**
- ne navodite adresu magacina, pogona ili gradilišta umesto sedišta
- ne navodite skraćenice i nadimke firme
- ne ostavljajte podatke koji se razlikuju od onih u registru — razlika usporava postupak

### A3 · `A3_APPLICANT_REGISTERED_DOMESTIC` · obavezno

**PITANJE**
Da li je podnosilac već osnovan i registrovan i da li ima prebivalište ili sedište u Republici Srbiji? Ako firma još nije osnovana, ko podnosi prijavu sada?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Prijavu može podneti samo lice koje ima pravo na zaštitu, a lice bez sedišta ili prebivališta u Srbiji mora imati zastupnika (MZ-140, MZ-141, MZ-147, MZ-150).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Društvo je registrovano u APR-u [datum], sa sedištem u [mesto], Republika Srbija. / Alternativa: Firma još nije osnovana. Prijavu bih sada podneo ja kao fizičko lice, [ime i prezime], sa prebivalištem u [mesto], Srbija. Nameravam da prava kasnije prenesem na firmu [planirani naziv]; kako se to radi nismo još proverili sa zastupnikom. / Alternativa: Podnosilac je strano lice sa sedištem u [država]; zastupnika [imamo / nemamo].

**OBAVEZNO POMENITE**
- da li je podnosilac već registrovan i od kog datuma
- država sedišta ili prebivališta
- ako firma ne postoji: ko tačno podnosi prijavu sada
- ako je planiran kasniji prenos prava: na koga

**NE PIŠITE**
- ne podnosite prijavu u ime firme koja još ne postoji
- ne pretpostavljajte da prenos prava na firmu ide automatski — to je pitanje za zastupnika (NEPROVERENO)

### A4 · `A4_REPRESENTATIVE_AND_ECERT` · obavezno

**PITANJE**
Da li će prijavu podnositi punomoćnik (registrovani zastupnik ili advokat)? Da li podnosilac ili punomoćnik ima kvalifikovani elektronski sertifikat za e-Prijavu?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Punomoćnik ide u polje 2 i zahteva prilog punomoćje; e-Prijava zahteva kvalifikovani sertifikat i donosi umanjenje takse od 25 % (MZ-012, MZ-081, MZ-153, MZ-154).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Prijavu podnosimo sami, bez punomoćnika; pre podnošenja planiramo proveru kod registrovanog zastupnika. Zakonski zastupnik društva, [ime i prezime], ima kvalifikovani elektronski sertifikat [na ličnoj karti / izdavalac: …], pa bismo koristili e-Prijavu. / Alternativa: Prijavu podnosi zastupnik [ime, broj upisa u Registar zastupnika ZIS-a]; punomoćje je potpisano [datum]. / Alternativa: Nemamo sertifikat i podnosimo papirno, neposredno u pisarnici ZIS-a.

**OBAVEZNO POMENITE**
- sa punomoćnikom ili bez njega
- ako sa punomoćnikom: ime i broj iz Registra zastupnika ZIS-a, ko potpisuje punomoćje
- da li postoji kvalifikovani elektronski sertifikat i ko ga ima
- planirani način podnošenja: e-Prijava ili papirno

**NE PIŠITE**
- ne računajte na podnošenje e-mailom ili faksom — ZIS ih ne prima (MZ-011)
- ne upisujte iznos takse — iznosi su poznati iz Matrice (MZ-080 – MZ-091)


---

## Grupa B — Autor / dizajner

_Ko je osmislio spoljašnji izgled i po kom osnovu podnosilac ima pravo na prijavu (D-1 polja 5 i 6, prilozi)._

### B1 · `B1_AUTHOR_IDENTITY` · obavezno

**PITANJE**
Ko je osmislio spoljašnji izgled panela (oblik, ivice, izgled prednje površine)? Da li je autor jedan ili ih ima više? Za svakog navedite ime, prezime i adresu.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Podaci o autoru su obavezan element zahteva (D-1 polje 5), a autor ima moralno pravo da bude naveden (MZ-060, MZ-142, MZ-143).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Spoljašnji izgled panela osmislio je jedan autor: [ime i prezime], [adresa prebivališta]. Druga lica nisu učestvovala u oblikovanju izgleda; [proizvođač alata / projektant] je samo izradio dokumentaciju prema zadatom rešenju. / Alternativa: Autori su dva lica: [ime 1], [adresa 1] — oblik ivica i proporcije; [ime 2], [adresa 2] — izgled prednje površine (tekstura i boja).

**OBAVEZNO POMENITE**
- ime, prezime i adresa svakog autora
- tačan broj autora
- da li je neko spoljno lice (dizajner, projektant, proizvođač) doprineo izgledu
- ako ima više autora: ko je oblikovao koji deo izgleda

**NE PIŠITE**
- ne navodite kao autora lice koje je samo crtalo ili izrađivalo alat po tuđem rešenju — ako niste sigurni, napišite to, pa se proverava
- ne navodite firmu kao autora; autor je uvek fizičko lice (NEPROVERENO za slučaj službenog dela, P-08)

### B2 · `B2_AUTHOR_APPLICANT_RELATION` · obavezno

**PITANJE**
Kakav je odnos između autora i podnosioca: da li je autor ujedno podnosilac, zaposlen kod podnosioca, angažovan po ugovoru ili je prava preneo? Ako podnosilac nije autor, po kom osnovu ima pravo na prijavu i da li o tome postoji pisani dokument?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ako autor nije podnosilac, D-1 polje 6 traži pravni osnov, a uz prijavu se prilaže izjava o osnovu sticanja prava; za dizajn iz radnog odnosa važe pravila zakona o patentima (MZ-073, MZ-140, MZ-142, MZ-144).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Autor [ime i prezime] je osnivač i direktor podnosioca i izgled je osmislio u radu za društvo. Postoji [ugovor o radu / ugovor o delu / ugovor o prenosu prava] od [datum], u kome [jeste / nije] izričito uređeno ko stiče prava na dizajn. Pisana izjava o osnovu sticanja prava [postoji / još nije sastavljena]. / Alternativa: Autor i podnosilac su isto lice, [ime i prezime], pa pravni osnov nije potreban.

**OBAVEZNO POMENITE**
- da li su autor i podnosilac isto lice
- vrsta odnosa: radni odnos, ugovor o delu, prenos prava, drugo
- naziv i datum dokumenta i da li pominje industrijski dizajn ili intelektualnu svojinu
- ako ima više autora: osnov za svakog posebno
- da li je izjava o osnovu sticanja prava već potpisana

**NE PIŠITE**
- ne tvrdite da prava „automatski“ pripadaju firmi bez dokumenta — to se proverava (P-08)
- ne opisujte šta je autor tehnički rešio; ovde je bitan samo odnos i osnov

### B3 · `B3_AUTHOR_WANTS_TO_BE_NAMED` · obavezno

**PITANJE**
Da li autor (svaki od autora) želi da bude naveden u prijavi i u registru?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ako autor ne želi da bude naveden, prilaže se njegova izjava; u suprotnom se navodi u polju 5 obrasca D-1 (MZ-143).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Autor [ime i prezime] želi da bude naveden punim imenom i prezimenom u prijavi i u registru. Posebna izjava zato nije potrebna. / Alternativa: Autor [ime i prezime] ne želi da bude naveden. Potpisaće izjavu o tome [datum], a ostali autori žele da budu navedeni. Autor zna da izjavu može kasnije da povuče.

**OBAVEZNO POMENITE**
- odgovor za svakog autora posebno
- ako ne želi: da li je izjava već potpisana
- da li je autor upoznat da izjavu može kasnije da povuče

**NE PIŠITE**
- ne odlučujte umesto autora — izjavu daje autor lično


---

## Grupa C — Proizvod

_Naziv, namena i vidljivi delovi — uvod opisa i osnova za Lokarnsku klasu._

### C1 · `C1_PRODUCT_NAME` · obavezno

**PITANJE**
Kako biste kratko i stvarno nazvali proizvod, bez trgovačkog imena i bez reklamnih reči? Dajte glavni predlog i jedan rezervni.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Naziv ide u polje 3 obrasca D-1 i mora biti kratak i stvaran; na osnovu naziva ispitivač određuje Lokarnsku klasu i potklasu (MZ-063, MZ-210, MZ-211).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Glavni predlog naziva: „Fasadni termoizolacioni panel“. Rezervni predlog: „Fasadni panel sa profilisanim ivicama i završnim slojem“. Trgovačko ime naše linije, [naziv linije], ne bismo stavljali u naziv. Namena, oblaganje spoljnih zidova zgrada, vidi se iz naziva. Ako je potrebno razgraničiti potklasu, dodali bismo reč [„ploča“ / „obloga“].

**OBAVEZNO POMENITE**
- vrsta proizvoda običnim rečima (panel, ploča, obloga)
- dva do šest reči
- bez trgovačkog imena i bez naziva firme
- jedan rezervni predlog
- da li iz naziva jasno sledi namena

**NE PIŠITE**
- ne „inovativni“, „patentirani“, „jedinstveni“ — naziv ne sme biti komercijalan (MZ-063)
- ne tehnička svojstva u nazivu (koeficijenti, klase gorivosti, debljina izolacije) — opis ne sadrži funkciju (MZ-042)
- ne sastav materijala kao tehnička osobina u nazivu — otvoreno pitanje NS-06; „EPS“ ostavite za internu evidenciju

### C2 · `C2_PRODUCT_PURPOSE` · obavezno

**PITANJE**
Šta proizvod predstavlja i gde se i kako koristi? Opišite namenu u jednoj do dve rečenice, kako bi stajala u uvodu opisa.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Namena se u opisu navodi samo ako nije jasna iz naziva i usmerava Lokarnsku potklasu (25-01 ili 25-02); iznosi se bez tehničkih svojstava (MZ-043, MZ-048, MZ-210).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Proizvod je ploča pravougaonog oblika koja se postavlja na spoljne zidove zgrada kao fasadna obloga. Prednja površina ploče nosi završni fasadni sloj koji ostaje vidljiv na gotovoj fasadi, pa se posle postavljanja fasada ne malteriše i ne boji. Ploče se postavljaju jedna uz drugu u redovima i pokrivaju celu fasadnu površinu, [na novogradnji / pri obnovi postojećih fasada / u oba slučaja]. Na gotovoj fasadi vidi se [samo prednja površina sa završnim slojem / prednja površina i naglašene fuge između ploča].

**OBAVEZNO POMENITE**
- vrsta objekta i položaj na objektu
- ko vidi proizvod i iz koje daljine (prolaznik, stanar, izvođač)
- da li se vidi kao pojedinačna ploča ili kao polje od više ploča
- da li se posle postavljanja nešto nanosi preko (ako ne, reći to kao izgled, ne kao prednost)

**NE PIŠITE**
- ne termoizolaciona svojstva, ušteda energije, koeficijenti (MZ-042)
- ne način lepljenja, pričvršćivanja ni redosled montaže (MZ-042)
- ne „pronalazak“, „tehnički problem“, „tehnički efekat“ — patentni rečnik (pravila projekta, tačka 1)

### C3 · `C3_VISIBLE_PARTS_IN_USE` · obavezno

**PITANJE**
Koji delovi panela ostaju vidljivi posle ugradnje, u normalnoj upotrebi fasade? Koji delovi se vide samo pre ugradnje (u skladištu, na gradilištu, pri montaži)?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Prikaz i opis obuhvataju spoljašnji izgled i delove vidljive stalno ili pri redovnoj upotrebi; sastavni deo složenog proizvoda štiti se samo u meri u kojoj ostaje vidljiv (MZ-020, MZ-193, MZ-194).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Posle ugradnje stalno je vidljiva prednja površina sa završnim slojem (1). Na gotovoj fasadi vidi se i [tanka fuga / senka / utisnuta linija] između susednih ploča, širine približno [jedne desetine debljine ploče]. Zadnja površina (2) i preklopni delovi profila na ivicama (5) nisu vidljivi posle ugradnje. Pre ugradnje ploča se kao samostalan proizvod vidi sa svih strana: duže ivice (3), kraće ivice (4) i zadnja površina (2). Na krajevima fasade (uglovi zgrade, otvori) vidi se i [bočna kraća ivica sa trakom završnog sloja / poseban završni element], ako se ne pokriva drugim elementom.

**OBAVEZNO POMENITE**
- prednja površina — uvek navesti
- da li se između ploča vidi fuga, linija ili senka i koliko je široka u odnosu na ploču
- koje ivice ostaju vidljive posle ugradnje i gde (uglovi zgrade, otvori)
- šta se vidi samo pre ugradnje
- zadnja površina: da li je ikada vidljiva korisniku

**NE PIŠITE**
- ne opisujte kako se montira, čime se lepi ili pričvršćuje — samo šta se vidi (MZ-042)
- ne opisujte šta profil „radi“ u spoju — to je grupa E i ne ulazi u opis

### C4 · `C4_LOGO_OR_MARKING` · obavezno

**PITANJE**
Da li panel na bilo kojoj površini nosi logo, natpis, utisnut znak, šifru ili drugu oznaku?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Znak ili natpis se uklanja sa prikaza ili se u opisu navodi da se za njega ne traži zaštita industrijskim dizajnom (MZ-049).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Na prednjoj površini (1) nema nikakvog znaka, natpisa ni logotipa. Na zadnjoj površini (2) [se nalazi / se ne nalazi] odštampana oznaka [naziv firme / šifra proizvoda], koja nije deo izgleda proizvoda i nije vidljiva posle ugradnje; na prikazima bismo je izostavili. Utisnutih znakova na ivicama nema.

**OBAVEZNO POMENITE**
- svaka površina posebno: prednja, zadnja, ivice
- šta je oznaka (logo, tekst, šifra) i kako je naneta (štampa, utiskivanje, nalepnica)
- da li želite da se oznaka vidi na prikazima ili da se izostavi

**NE PIŠITE**
- ne ostavljajte logo na prikazu bez odluke — ZIS traži uklanjanje ili izjavu da se za njega ne traži zaštita (MZ-049)

### C5 · `C5_EXISTING_VISUAL_MATERIALS` · obavezno

**PITANJE**
Koji materijali o izgledu panela već postoje: fotografije, renderi, 3D (CAD) model, tehnički crteži, fizički uzorak ili prototip? Navedite šta tačno prikazuju, u kom su formatu i kakva im je pozadina.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Prikaz mora biti fotografija ili nacrt profesionalnog kvaliteta, na neutralnoj podlozi, bez kota, preseka i legendi; postojeći materijali su ulaz za plan prikaza i analizu dizajna (MZ-021, MZ-029, MZ-030).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Imamo 3D model u formatu [STEP / SketchUp / SolidWorks] koji prikazuje jednu ploču sa svim ivicama, bez teksture završnog sloja. Imamo [broj] fotografija fizičkog uzorka [približne veličine], snimljenih [na gradilištu / u hali], na pozadini koja nije neutralna. Imamo tehničke crteže profila ivica sa kotama i presecima (DWG/PDF). Fizički uzorak postoji i može se iznova fotografisati na jednobojnoj podlozi, bez senki. Render sa stvarnom teksturom i bojom [imamo / nemamo].

**OBAVEZNO POMENITE**
- svaki tip materijala: foto, render, 3D model, crtež, uzorak
- šta tačno prikazuje (cela ploča, samo ivica, polje od više ploča)
- format i da li sadrži kote, preseke, tekst
- pozadina i senke na fotografijama
- da li je uzorak dostupan za novo fotografisanje

**NE PIŠITE**
- ne računajte da su kotirani proizvodni crteži upotrebljivi kao prikaz — prikaz ne sme imati kote, preseke ni legende (MZ-030)
- ne dostavljajte fotografije sa zgradom, alatom ili drugim predmetima u kadru (MZ-023)


---

## Grupa D — Vizuelne karakteristike

_Svaka vidljiva celina posebno, geometrijskim pojmovima. Ovi odgovori su glavni izvor za tekst opisa i za plan prikaza._

### D1 · `D1_OVERALL_SHAPE` · obavezno

**PITANJE**
Kako izgleda panel u celini, posmatran kao jedno telo? Opišite ga geometrijskim pojmovima, kao da ga opisujete nekome ko ga ne vidi: osnovni oblik, od kojih se celina sastoji i kako izgleda iz tri glavna pravca.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Opis počinje oblikom u celini; sam generični oblik (ploča, prizma) nije dovoljan za zaštitu, pa se već ovde ističe šta ga čini različitim (MZ-047, MZ-048, MZ-177).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Panel je ravna ploča u obliku izduženog pravougaonika, male debljine u odnosu na dužinu i visinu. Sastoji se od tela ploče i završnog sloja na prednjoj površini (1), koji je vizuelno izdvojen kao tanka ravan druge boje. Duže ivice (3) su profilisane stepenasto, tako da je ploča u pogledu sa kraće strane u obliku [slova „Z“ / pravougaonika sa isečenim naspramnim uglovima]. Kraće ivice (4) su [ravne / takođe stepenaste]. Završni sloj se prostire [do same ivice / i preko gornjeg stepenika duže ivice]. U pogledu spreda ploča je čist pravougaonik bez otvora; u pogledu odozgo vidi se izdužena traka sa pragom duž cele dužine. Ukupan utisak je ploča čiji su naspramni krajevi smaknuti, sa ujednačenom, [zrnastom] prednjom površinom.

**OBAVEZNO POMENITE**
- osnovni geometrijski oblik (pravougaona ploča, kvadrat, drugo) i odnos debljine prema visini rečima
- nazivi celina od kojih se sastoji: telo, završni sloj, ivice
- kako izgleda spreda, sa kraće strane i odozgo
- šta „ispada“ iz običnog pravougaonika (stepenici, zakošenja, žljebovi)
- odnos završnog sloja i tela: da li se sloj vidi kao posebna celina

**NE PIŠITE**
- ne čemu služi oblik, ni šta omogućava u spoju (MZ-042)
- ne mere u milimetrima — proporcije rečima (MZ-030, MZ-048)
- ne sastav tela (EPS) kao tehnička osobina (NS-06) i ne „pronalazak“, „rešenje tehničkog problema“

### D2 · `D2_PROPORTIONS` · obavezno

**PITANJE**
Kakve su proporcije panela: odnos dužine prema visini, debljine prema visini, debljine završnog sloja prema debljini ploče i visine stepenika prema debljini ploče?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Opis koristi približne proporcije rečima („približno jedna desetina“), a ne kote, jer prikaz ne sme sadržati dimenzije (MZ-030, MZ-048).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Dužina ploče je približno [dva] puta veća od visine. Debljina ploče iznosi približno [jednu desetinu] visine. Završni sloj je vrlo tanak u odnosu na telo, približno [jedna dvadesetina] debljine, i na ivicama se vidi kao tanka traka. Stepenik na dužoj ivici zauzima približno [polovinu] debljine ploče, a njegova širina (dubina preklopa) je približno [jednaka / dvostruka] u odnosu na visinu stepenika. Kraće ivice [nemaju stepenik / imaju stepenik istih proporcija]. Za internu evidenciju: tačne mere su [dužina × visina × debljina] mm; one ne ulaze u opis.

**OBAVEZNO POMENITE**
- dužina : visina
- debljina : visina
- debljina završnog sloja : debljina ploče
- visina i širina stepenika u odnosu na debljinu ploče
- tačne mere samo kao interna napomena, jasno odvojena

**NE PIŠITE**
- ne pišite mere kao deo opisa izgleda — opis koristi približne proporcije (MZ-048)
- ne tolerancije, težinu, gustinu — nisu izgled (MZ-042)

### D3 · `D3_FRONT_TEXTURE` · obavezno

**PITANJE**
Kako izgleda tekstura vidljive prednje površine (završnog sloja)? Opišite vrstu reljefa, krupnoću zrna, ujednačenost, pravac, vidljivi motiv ako postoji i da li tekstura ide do same ivice.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Tekstura je vizuelna karakteristika koja se opisuje kao izgled, a ne kao sastav; mora biti čitljiva na prikazu bez senki (MZ-029, MZ-041, NS-06).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Prednja površina (1) ima ujednačenu, sitno zrnastu reljefnu teksturu, po izgledu sličnu [zaribanom malteru / prskanom malteru / brušenom kamenu]. Zrna su [sitna, manja od zrna pirinča / srednje krupna, veličine zrna graška] i raspoređena ravnomerno, bez izraženog pravca i bez motiva. Tekstura je ista po celoj površini i ide do samih ivica, bez glatkog oboda. Na zakošenju uz gornju ivicu tekstura [se nastavlja / prelazi u glatku površinu]. Pri kosom svetlu reljef daje [blagu / izraženu] igru sitnih svetlih i tamnih tačaka. / Alternativa: Površina je glatka, bez reljefa, sa blagim tragovima [gletovanja / valjka] u [vodoravnom] pravcu.

**OBAVEZNO POMENITE**
- vrsta reljefa: zrnasta, brazdasta, glatka, imitacija (kamen, drvo, opeka)
- krupnoća zrna ili brazdi, poređenjem sa poznatim predmetom
- ujednačenost i pravac (bez pravca, vodoravno, uspravno, dijagonalno)
- vidljivi motiv ili šara, ako postoji, i njen raspored
- da li tekstura ide do same ivice ili postoji glatki obod
- kako izgleda pod kosim svetlom (igra svetla i senke)

**NE PIŠITE**
- ne sastav sloja (akrilni, silikonski, mineralni) ni EPS kao materijal tela — materijal kao tehnička osobina je otvoreno pitanje NS-06 (P-06)
- ne vodootpornost, paropropusnost, otpornost na udar — svojstva nisu izgled (MZ-042)
- ne način nanošenja (prskanje, valjak, fabrički) — to je proizvodnja (MZ-042)

### D4 · `D4_FRONT_COLOR` · obavezno

**PITANJE**
Koje je boje prednja površina? Opišite nijansu rečima (i oznakom iz ton karte ako postoji), da li je jednobojna ili sa prelazima, kako se boja odnosi prema boji tela ploče vidljivoj na ivicama, i da li je boja deo onoga što želite da zaštitite.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Boja je vizuelna karakteristika; prikaz može biti crno-beli ili u boji, a opis se mora slagati sa prikazom, pa odluka o boji utiče na oba (MZ-025, MZ-041, NS-07).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Prednja površina (1) je jednobojna, [svetlo siva] nijansa, bez prelaza i bez šara; oznaka iz ton karte [RAL 7035 / NCS S 1500-N]. Boja je ista do same ivice. Telo ploče, vidljivo na ivicama (3, 4) i na zadnjoj površini (2), je [bele] boje i jasno se razlikuje od završnog sloja, tako da se sloj na svakoj ivici vidi kao tanka [siva] traka na [beloj] podlozi (6). Boju nudimo u [tri] varijante (vidi grupu F), pa je ne smatramo jedinim obeležjem dizajna. / Alternativa: Boja je bitan deo izgleda; panel se nudi samo u [nijansa].

**OBAVEZNO POMENITE**
- nijansa rečima (svetlo siva, pesak, antracit) i oznaka iz ton karte ako postoji
- jednobojno ili sa prelazima, mrljama, višebojnim zrnima
- boja tela ploče na ivicama i zadnjoj strani i da li se razlikuje od sloja
- da li je boja ista do ivice
- da li je boja deo dizajna ili se nudi u više varijanti

**NE PIŠITE**
- ne postojanost boje, UV otpornost, premazi — nisu izgled (MZ-042)
- ne pigment, vezivo, sastav — materijal kao tehnička osobina (NS-06)

### D5 · `D5_FRONT_FINISH` · obavezno

**PITANJE**
Kakva je površinska obrada prednje površine: mat, polumat ili sjajna; glatka ili hrapava na dodir; sa vidljivim tragovima alata, šavovima ili bez njih? Kako izgleda sama ivica završnog sloja?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Površinska obrada je deo spoljašnjeg izgleda i određuje kako se prikaz fotografiše bez senki i odsjaja (MZ-029, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Površina (1) je mat, bez sjaja i bez odsjaja. Na dodir je hrapava zbog zrnaste teksture, ali bez oštrih vrhova. Nema vidljivih tragova alata, šavova ni spojnica od proizvodnje. Ivica završnog sloja je [oštro odsečena / blago zaobljena] i uočava se kao tanka linija (6) između sloja i tela. Zadnja i bočne površine tela su [glatke, blago porozne, bez posebne obrade / sa sitnim kuglastim reljefom].

**OBAVEZNO POMENITE**
- stepen sjaja: mat, polumat, sjajno
- utisak na dodir: glatko, hrapavo, grubo
- tragovi proizvodnje: šavovi, linije alata, ili bez njih
- kako izgleda ivica završnog sloja (oštra, zaobljena, nazubljena)
- obrada ostalih površina (telo na ivicama i zadnjoj strani)

**NE PIŠITE**
- ne zaštitni efekat obrade (hidrofobnost, samočišćenje) — funkcionalna prednost (MZ-042)
- ne tehnologija obrade (presovanje, sečenje žicom) — proizvodnja (MZ-042)

### D6 · `D6_BACK_SURFACE` · obavezno

**PITANJE**
Kako izgleda zadnja strana panela i da li je ikada vidljiva korisniku? Ima li na njoj žljebove, kanale, ispupčenja, reljef ili oznake?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Delovi koji nisu vidljivi u redovnoj upotrebi ne doprinose zaštiti sastavnog dela; ako zadnja strana ima prepoznatljiv izgled pre ugradnje, treba odlučiti da li ulazi u prikaze (MZ-020, MZ-193, MZ-026).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Zadnja površina (2) je ravna, glatka, [bele] boje, bez završnog sloja. Na njoj [nema reljefa / se nalaze plitki paralelni kanali širine približno jedne desetine visine ploče, na jednakim razmacima, koji idu po celoj dužini]. Vidi se samo pre ugradnje. Ne smatramo je prepoznatljivim delom izgleda i [ne bismo / bismo] je uključili u prikaze.

**OBAVEZNO POMENITE**
- ravna ili sa reljefom; ako reljef: oblik, pravac, broj, razmak
- boja i obrada
- da li je ikada vidljiva posle ugradnje
- da li želite da bude na prikazima

**NE PIŠITE**
- ne čemu služe kanali ili reljef (lepak, ventilacija, prianjanje) — funkcija (MZ-042)

### D7 · `D7_TOP_EDGE` · obavezno

**PITANJE**
Kako izgleda gornja (duža, vodoravna) ivica panela, posmatrana spolja? Opišite oblik njenog profila kao geometriju: ravna, stepenasta, zakošena, zaobljena; broj, smer i proporcije stepenika; gde se završava završni sloj.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Delovi se opisuju određenim redom, svaka ivica posebno, geometrijskim pojmovima, i svaka mora biti vidljiva na odgovarajućem prikazu (MZ-026, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Gornja duža ivica (3a) je stepenasta, sa jednim stepenikom (5): prednji deo debljine, uz završni sloj, izbačen je prema gore u odnosu na zadnji deo, tako da nastaje prag u obliku slova „L“. Visina praga je približno [polovina] debljine ploče, a njegova širina približno [jednaka visini]. Ivice praga su [oštre / blago zaobljene]. Završni sloj (1) [se završava u ravni prednje površine / prelazi preko čela praga do dubine približno …] i na ivici se vidi kao tanka traka (6). U pogledu sa kraće strane gornja i donja ivica zajedno daju konturu u obliku slova „Z“. / Alternativa: Gornja ivica je ravna, upravna na prednju površinu, bez profila.

**OBAVEZNO POMENITE**
- osnovni oblik profila: ravna, stepenasta, zakošena, zaobljena, pero-žljeb
- broj stepenika i smer (prednji deo gore ili zadnji deo gore)
- proporcije stepenika prema debljini ploče, rečima
- oštrina ivica stepenika
- gde se završava završni sloj i kako se vidi na ivici
- da li je profil isti po celoj dužini

**NE PIŠITE**
- ne svrha preklopa (zaptivanje, sprečavanje toplotnog mosta, vođenje vode) — funkcija (MZ-042)
- ne kako ivica naleže na susednu ploču — spajanje je grupa E i ne ulazi u opis
- ne presek sa kotama — prikaz ne sme biti tehnički crtež (MZ-030)

### D8 · `D8_BOTTOM_EDGE` · obavezno

**PITANJE**
Kako izgleda donja (duža, vodoravna) ivica panela? Da li je ogledalska slika gornje, istog smera ili drugačija? Šta se vidi na gotovoj fasadi tamo gde se donja ivica jedne ploče sreće sa gornjom ivicom druge?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Svaka ivica se opisuje posebno i mora biti vidljiva na prikazu; odnos gornje i donje ivice određuje konturu u pogledu sa strane (MZ-026, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Donja duža ivica (3b) ima stepenik suprotnog smera od gornje: prednji deo debljine je uvučen, a zadnji deo izbačen nadole, tako da je profil donje ivice ogledalska slika gornje u odnosu na sredinu debljine. Proporcije praga su iste kao na gornjoj ivici. Završni sloj (1) se završava [u ravni prednje površine, oštro odsečen / sa zakošenjem]. Na gotovoj fasadi, na spoju donje ivice jedne i gornje ivice susedne ploče, vidi se [tanka vodoravna linija / fuga širine približno jedne desetine debljine / ništa, površine su u ravni]. / Alternativa: Donja ivica je istog oblika i smera kao gornja, nije ogledalska.

**OBAVEZNO POMENITE**
- odnos prema gornjoj ivici: ogledalska, ista, drugačija
- smer i proporcije stepenika
- kako se završava završni sloj
- šta se vidi na vodoravnom spoju dve ploče na fasadi

**NE PIŠITE**
- ne kako donja ivica „naleže“ ili „zaptiva“ — funkcija (MZ-042)
- ne mere u mm

### D9 · `D9_LEFT_EDGE` · obavezno

**PITANJE**
Kako izgleda leva (kraća, uspravna) ivica panela? Ravna, stepenasta ili drugačija; kako se na njoj vidi završni sloj; kakav je ugao prema prednjoj površini?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Kraće ivice su vidljive na uglovima zgrade i na otvorima, pa ulaze u prikaze i opis (MZ-020, MZ-026, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Leva kraća ivica (4a) je [ravna, upravna na prednju površinu, bez profila / stepenasta, istog oblika kao gornja ivica, sa prednjim delom izbačenim ulevo]. Završni sloj (1) je odsečen u ravni ivice i vidi se kao tanka [siva] traka (6) na gornjem rubu ivice. Ugao između prednje površine i ivice je [oštar, prav / oboren pod približno 45°, u širini od približno jedne desetine debljine]. Po visini je ivica ravna, bez žljebova i ispupčenja.

**OBAVEZNO POMENITE**
- oblik profila: ravna, stepenasta, zakošena
- kako se završni sloj vidi na ivici
- ugao prema prednjoj površini (prav, oboren, zaobljen)
- da li je ivica ista po celoj visini

**NE PIŠITE**
- ne kako se ploča spaja sa susednom po vertikali — grupa E (MZ-042)
- ne mere u mm

### D10 · `D10_RIGHT_EDGE` · obavezno

**PITANJE**
Kako izgleda desna (kraća, uspravna) ivica panela? Da li je istovetna levoj, ogledalska ili drugačija?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ako su leva i desna ivica različite, ploča nije simetrična i potrebni su dodatni pogledi; ako su iste, opis to kaže jednom rečenicom (MZ-026, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Desna kraća ivica (4b) je [istovetna levoj: ravna, upravna na prednju površinu, sa tankom trakom završnog sloja (6) na gornjem rubu / ogledalska slika leve: stepenik suprotnog smera, prednji deo uvučen]. Po visini je ravna, bez žljebova i ispupčenja, i ugao prema prednjoj površini je isti kao na levoj ivici. Ploča je zato u pogledu spreda [simetrična po uspravnoj osi / nije simetrična, jer …]. Na fasadi se uspravni spoj dve ploče vidi kao [tanka uspravna linija / fuga iste širine kao vodoravna].

**OBAVEZNO POMENITE**
- odnos prema levoj ivici: ista, ogledalska, drugačija
- ako je drugačija: isti elementi kao u D9 (profil, sloj, ugao)
- da li je ploča simetrična spreda

**NE PIŠITE**
- ne ponavljajte funkciju spoja; ne mere u mm (MZ-042, MZ-030)

### D11 · `D11_CORNERS` · obavezno

**PITANJE**
Kako izgledaju uglovi panela, mesta gde se ivice sastaju? Oštri, zaobljeni, oboreni, sa isečkom? Kako se stepenik duže ivice završava na kraćoj ivici?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Uglovi su mesta gde se profili ivica sreću i često su najuočljiviji detalj na prikazu u perspektivi (MZ-032, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Sva četiri ugla ploče u pogledu spreda su prava i oštra, bez zaobljenja. Na mestima gde se stepenasta duža ivica (3) sastaje sa ravnom kraćom ivicom (4), stepenik (5) [je presečen ravno do samog kraja ploče / se zaustavlja na približno jednoj desetini dužine od kraja, tako da nastaje mali pravougaoni isečak]. Uglovi završnog sloja (1) prate uglove ploče [bez zaobljenja / sa zaobljenjem poluprečnika približno jedne dvadesetine visine]. Na zadnjoj strani uglovi su prosti, pravi.

**OBAVEZNO POMENITE**
- oblik ugla spreda: prav, zaobljen, oboren
- kako se stepenik završava na kraju ploče (do kraja, zaustavljen, isečak)
- uglovi završnog sloja
- da li su sva četiri ugla ista

**NE PIŠITE**
- ne zašto je ugao takav (lakša montaža, manje otpada) — funkcija i proizvodnja (MZ-042)

### D12 · `D12_CHAMFERS` · obavezno

**PITANJE**
Da li na panelu postoje zakošenja (oborene ivice, faze)? Gde se nalaze, pod kojim približnim uglom, koliko su široka u odnosu na debljinu i da li nose završni sloj?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Zakošenje menja konturu ploče i izgled fuga na fasadi, pa se opisuje kao poseban element i mora se videti na prikazu (MZ-041, MZ-047).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Prelaz prednje površine (1) ka gornjoj (3a) i donjoj (3b) ivici oboren je pod približno 45°, u širini od približno [jedne desetine] debljine ploče, po celoj dužini. Zakošenje nosi isti završni sloj, iste boje i teksture kao prednja površina. Na kraćim ivicama (4) zakošenja nema. Na stepenicima (5) zakošenja nema. Na fasadi zakošenja dve susedne ploče zajedno daju [uzak žljeb trougaonog preseka] duž vodoravne fuge. / Alternativa: Zakošenja nema; sve ivice su prave i oštre.

**OBAVEZNO POMENITE**
- gde su zakošenja (koje ivice, koji uglovi)
- približan ugao i širina u odnosu na debljinu, rečima
- da li nose završni sloj ili pokazuju telo ploče
- kako izgleda fuga koju dva zakošenja zajedno daju

**NE PIŠITE**
- ne „radi lakšeg uklapanja“, „radi odvodnje vode“ — funkcija (MZ-042)
- ne mere u mm

### D13 · `D13_STEPS_AND_PROFILED_LINES_ON_SURFACES` · obavezno

**PITANJE**
Da li, osim na ivicama, na vidljivim površinama postoje stepenici, žljebovi, kanali, rebra, utisnute linije ili drugi profilisani elementi? Opišite im oblik preseka, pravac, broj i razmak.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Profilisani elementi na vidljivoj površini su mogući nosioci novosti i individualnog karaktera i moraju se jasno videti na prikazu (MZ-020, MZ-040).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Na prednjoj površini (1) [nema profilisanih elemenata; ona je ravna po celoj veličini] / [nalaze se dva vodoravna žljeba trougaonog preseka, širine približno jedne petnaestine visine ploče i dubine približno polovine debljine završnog sloja, koji dele površinu na tri jednaka vodoravna polja]. Žljebovi idu od jedne kraće ivice do druge, paralelno sa dužim ivicama. Dno žljeba nosi [istu teksturu / glatku površinu]. Na ivicama i na zadnjoj površini nema dodatnih profilisanih elemenata osim stepenika opisanog u D7 i D8.

**OBAVEZNO POMENITE**
- ima ili nema; ako ima: oblik preseka (trougao, polukrug, pravougaonik)
- pravac (vodoravno, uspravno, dijagonalno) i da li idu od ivice do ivice
- broj i razmak, u odnosu na visinu ploče
- da li su polja koja nastaju jednaka
- tekstura i boja unutar žljeba

**NE PIŠITE**
- ne čemu žljeb služi (dilatacija, vođenje vode, maskiranje spoja) — funkcija (MZ-042)
- ne kako se izrađuje

### D14 · `D14_REPEATING_ELEMENTS` · obavezno

**PITANJE**
Da li postoje elementi koji se ponavljaju: šare, fuge, rebra, blokovi, uzorak zrna? Na jednom panelu ili tek u polju od više panela? Kakav raster daju?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ponavljajući elementi i raster koji ploče daju na fasadi mogu nositi individualni karakter dizajna (MZ-040, MZ-172).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Na jednoj ploči nema ponavljajućih elemenata; prednja površina je ujednačena. U polju od više ploča ponavlja se samo raster fuga: vodoravne linije na razmaku jednakom visini ploče i uspravne linije na razmaku jednakom dužini, [sa smaknutim redovima kao kod zida od opeke / u pravilnoj mreži jedna iznad druge]. / Alternativa: Na prednjoj površini je uzorak koji podražava [kamene blokove / drvene daske], sastavljen od [broj] polja u [broj] redova, razdvojenih žljebovima iz D13; polja su [jednaka / naizmenično duža i kraća].

**OBAVEZNO POMENITE**
- ima ili nema ponavljanja na jednoj ploči
- šta se ponavlja u polju od više ploča (raster fuga, smaknuti redovi)
- geometrija rastera: razmaci u odnosu na dimenzije ploče
- da li je ponavljanje pravilno ili nasumično

**NE PIŠITE**
- ne opisujte zgradu ili okolinu — prikaz sadrži samo proizvod (MZ-023); raster opišite kao izgled koji ploče same daju

### D15 · `D15_MOST_DISTINCTIVE_FEATURES` · obavezno

**PITANJE**
Koje tri karakteristike izgleda smatrate najprepoznatljivijima u odnosu na druge fasadne panele koje ste videli na tržištu? Po čemu bi informisani kupac fasadnih obloga razlikovao vaš panel na prvi pogled?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Izdvojeni stav opisa navodi karakteristike za koje se traži zaštita i po kojima se cene novost i obim prava; ukupan utisak na informisanog korisnika je zakonsko merilo (MZ-040, MZ-044, MZ-172).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> 1) Stepenasti profil dužih ivica (3, 5) koji u pogledu sa kraće strane daje smaknutu konturu u obliku slova „Z“. 2) Tanak završni sloj (1) koji se na svim ivicama vidi kao kontrastna obojena traka (6) na [beloj] podlozi tela. 3) Ujednačena, [sitno zrnasta] prednja površina koja ide do same ivice, bez oboda. Paneli koje smo videli kod drugih imaju [ravne ivice / spoj pero-žljeb / glatku površinu bez sloja / sloj iste boje kao telo], pa se naš po tome razlikuje. Nismo sigurni da li je stepenasti spoj sam po sebi nov; to treba proveriti u pretrazi.

**OBAVEZNO POMENITE**
- tri karakteristike, rangirane
- svaka opisana kao izgled, sa oznakom elementa
- po čemu se razlikuje od panela koje poznajete (opisno, bez naziva konkurenata ako niste sigurni)
- šta niste sigurni da je novo

**NE PIŠITE**
- ne „jedini na tržištu“, „patentirano“ — tvrdnje o novosti proverava pretraga i ZIS (MZ-176)
- ne tehničke prednosti kao razlog prepoznatljivosti (brža montaža, bolja izolacija) (MZ-042)


---

## Grupa E — Profil za spajanje panela

_Posebna pažnja: ovde se razdvaja izgled od tehničke funkcije. Odgovori služe analizi (faza 4) i NE ulaze u opis; ovde se smeju navesti i dimenzije._

### E1 · `E1_JOINT_PROFILE_SHAPE` · obavezno

**PITANJE**
Opišite tačno kako izgleda profil za spajanje na ivicama: koliko stepenika, kog oblika i smera, kako se razlikuje između gornje, donje, leve i desne ivice. Ovde smete navesti i dimenzije — koristimo ih samo za razdvajanje izgleda od funkcije, ne ulaze u opis.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Profil ivica je ključni rizik isključenja zbog tehničke funkcije; odgovori iz grupe E služe analizi u fazi 4 i ne ulaze u tekst opisa (MZ-190, MZ-191, MZ-197).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Profil je jednostepeni preklop. Na gornjoj ivici prednja polovina debljine izbačena je prema gore za [15] mm; na donjoj ivici zadnja polovina debljine izbačena je nadole za istu meru. Širina stepenika je [50] mm pri ukupnoj debljini ploče od [100] mm. Ivice stepenika su pod pravim uglom, bez zaobljenja i bez zazora. Kraće ivice su [ravne / imaju isti preklop]. Ne postoji pero-žljeb, zaptivka ni dodatni element. Profil je isti po celoj dužini ivice.

**OBAVEZNO POMENITE**
- broj stepenika i smer na svakoj od četiri ivice
- dimenzije stepenika (visina, širina) i debljina ploče — ovde su dozvoljene
- oblik uglova stepenika (prav, zaobljen, kos)
- da li postoji zazor, pero-žljeb, zaptivka ili dodatni element
- da li je profil isti po celoj dužini

**NE PIŠITE**
- ne mešajte ovaj odgovor sa tekstom opisa — ovde se funkcija sme pomenuti, u opisu ne (MZ-042)
- ne koristite „patentni zahtev“, „pronalazak“, „inventivni nivo“ ni ovde — ovo je analiza izgleda, ne patentna prijava

### E2 · `E2_JOINT_VISIBLE_AFTER_INSTALL` · obavezno

**PITANJE**
Koji delovi profila ostaju vidljivi posle montaže, a koji postaju skriveni? Šta se od profila vidi na uglovima zgrade, oko otvora i na poslednjem redu?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Sastavni deo složenog proizvoda štiti se samo za ono što ostaje vidljivo u redovnoj upotrebi; da li je fasada „složeni proizvod“ je otvoreno pitanje P-11 (MZ-193, MZ-194).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Posle montaže stepenici na gornjoj i donjoj ivici su potpuno skriveni, jer ih pokriva susedna ploča. Na spoju se spolja vidi samo [tanka linija / fuga širine oko … mm]. Na uglovima zgrade i oko prozora kraće ivice ostaju vidljive sa trakom završnog sloja, osim ako se pokriju [ugaonom lajsnom / posebnim ugaonim panelom]. Na poslednjem (gornjem) redu gornji stepenik ostaje otkriven dok se ne postavi [završni profil / opšivka]. Zadnja strana nikad nije vidljiva.

**OBAVEZNO POMENITE**
- šta se vidi na običnom spoju dve ploče
- šta se vidi na uglovima zgrade i oko otvora
- šta se vidi na prvom i poslednjem redu
- da li se neki deo profila ikada vidi stanaru ili prolazniku

**NE PIŠITE**
- ne opisujte lepak, tiplove, lajsne drugih proizvođača kao deo dizajna — prikaz sadrži samo proizvod (MZ-023)

### E3 · `E3_JOINT_ALTERNATIVE_SHAPES` · obavezno

**PITANJE**
Da li bi isti spoj (preklop između ploča) mogao da radi i sa drugačijim oblikom, na primer pero-žljeb, kosi preklop, zaobljeni stepenik, dva manja stepenika ili drugačije proporcije stepenika? Navedite koje alternative znate ili ste razmatrali.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Zaštita se ne priznaje izgledu koji je isključivo određen tehničkom funkcijom; postojanje alternativa koje isto rade govori da oblik nije isključivo funkcionalan (MZ-190).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Da. Isti preklop bi radio i kao kosi preklop pod uglom, kao pero-žljeb ili kao dvostepeni stepenik; sve tri varijante smo [razmatrali / videli kod drugih proizvođača]. Proporcije stepenika mogle bi biti drugačije, na primer [trećina / dve trećine] debljine umesto polovine, bez uticaja na spoj. Ivice stepenika bi mogle biti zaobljene. Izabrali smo prav jednostepeni preklop sa [polovinom] debljine jer [daje čistu liniju spoja / je najjednostavniji za izradu] — to drugo je razlog proizvodnje, ne izgleda.

**OBAVEZNO POMENITE**
- da ili ne, sa obrazloženjem
- konkretne alternative (pero-žljeb, kosi preklop, drugi stepenik, druge proporcije)
- šta je kod alternativa isto, a šta drugačije u izgledu
- zašto ste izabrali baš ovaj oblik — iskreno, i estetske i proizvodne razloge

**NE PIŠITE**
- ne ulepšavajte — ako je oblik jedini mogući, recite to; posledice procenjuje faza 4, ne vi
- ne donosite pravni zaključak („ovo sigurno nije funkcionalno“)

### E4 · `E4_JOINT_AESTHETIC_CHOICE` · obavezno

**PITANJE**
Da li je izgled profila biran i zbog estetike? Šta ste hteli da postignete u izgledu spoja i fasade (čista linija, naglašena fuga, utisak jedne površine)?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Stepen slobode autora i estetski izbor ulaze u ocenu individualnog karaktera i u razdvajanje izgleda od funkcije (MZ-172, MZ-190).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Da, delimično. Hteli smo da gotova fasada izgleda kao [jedna neprekinuta površina sa jedva vidljivim linijama / polje jasno odvojenih ploča sa naglašenom fugom]. Zato je stepenik postavljen na [polovinu] debljine i završni sloj [prelazi preko gornjeg praga / je odsečen u ravni], da se na spoju ne vidi belo telo ploče. Na uzorku bez te odluke spoj je izgledao kao [široka bela linija]. Oblik stepenika sam po sebi nismo birali zbog estetike, jer se posle montaže ne vidi.

**OBAVEZNO POMENITE**
- šta ste hteli da fasada izgleda (jedna površina, raster, naglašena fuga)
- koje odluke o profilu su donete zbog izgleda, a koje nisu
- da li je bilo varijanti koje ste odbacili zbog izgleda

**NE PIŠITE**
- ne pretvarajte proizvodne razloge u estetske — oba se beleže, odvojeno

### E5 · `E5_JOINT_MANUFACTURING_CONSTRAINTS` · obavezno

**PITANJE**
Koji delovi profila i ivica su uslovljeni proizvodnjom (alat, kalup, sečenje) ili montažom, tako da ne biste mogli da ih promenite?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Izgled koji mora biti tačno takav da bi se proizvod mehanički povezao sa drugim ne može se štititi; treba znati koji su delovi tako uslovljeni (MZ-190, MZ-191).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Pravi ugao stepenika je uslovljen [sečenjem vrućom žicom / kalupom], jer se zaobljenje ne može dobiti tim postupkom. Visina stepenika mora biti ista na gornjoj i donjoj ivici da bi se ploče uklopile. Debljina završnog sloja je uslovljena [postupkom nanošenja] i ne možemo je bitno menjati. Širina stepenika, prisustvo zakošenja, tekstura i boja nisu uslovljeni proizvodnjom. Kraće ivice su ravne iz razloga [sečenja / nije uslovljeno, mogle bi biti profilisane].

**OBAVEZNO POMENITE**
- svaki element profila: uslovljen ili slobodan
- čime je uslovljen (alat, kalup, sečenje, montaža, ukapanje sa susednom pločom)
- šta se može slobodno menjati

**NE PIŠITE**
- ne opisujte proizvodni postupak detaljno — dovoljno je šta ograničava izgled
- ne „patentni zahtev“, „tehnički problem“ — ni ovde

### E6 · `E6_JOINT_DIMENSIONS_FREE_TO_CHANGE` · obavezno

**PITANJE**
Koje dimenzije i proporcije profila mogu da se promene a da spoj i dalje radi? Koje ne mogu?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Isključenje se odnosi na oblik koji mora biti reprodukovan u tačnom obliku i dimenzijama radi povezivanja; sloboda u dimenzijama govori protiv isključenja (MZ-191).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Širina stepenika može biti od [30] do [70] mm bez uticaja na spoj; visina stepenika može biti bilo koja, pod uslovom da je ista na gornjoj i donjoj ivici. Ukupna debljina ploče može da varira od [60] do [200] mm, a profil ostaje istog oblika, samo srazmerno veći. Ne može da se promeni samo to da gornji i donji stepenik budu suprotnog smera i jednake visine. Dužina i visina ploče su potpuno slobodne.

**OBAVEZNO POMENITE**
- raspon u kome svaka mera može da varira
- koji odnosi moraju ostati isti (npr. jednake visine stepenika)
- da li oblik ostaje isti kada se ploča skalira

**NE PIŠITE**
- ne zaključujte sami da li je to „dovoljno slobode“ — procena je u fazi 4 i kod zastupnika (NEPROVERENO, P-10)

### E7 · `E7_MODULAR_SYSTEM` · obavezno

**PITANJE**
Da li se paneli međusobno zamenjuju i višestruko slažu u sistem (svaki panel uz svaki)? Da li se panel prodaje samostalno ili kao deo sistema sa drugim elementima (ugaoni, početni, završni profili, lajsne)? Da li spoj radi i sa proizvodima drugih proizvođača?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Dizajn koji omogućava višestruko sastavljanje zamenjivih proizvoda u modularnom sistemu može se štititi uprkos isključenju za spojeve; to je otvoreno pitanje P-10 (MZ-192, MZ-194, MZ-122).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Da. Svaki panel se može postaviti uz bilo koji drugi panel iste serije, u bilo kom redu, i paneli su međusobno zamenjivi. Panel se prodaje [samostalno, po komadu ili paleti / kao sistem sa ugaonim i završnim elementima]. Dodatni elementi sistema su: [ugaoni panel, početna lajsna, završni profil]; oni [imaju / nemaju] isti završni sloj. Spoj [radi / ne radi] sa panelima drugih proizvođača, jer [stepenik je drugačiji / isti standardni profil].

**OBAVEZNO POMENITE**
- zamenjivost panela među sobom
- samostalan proizvod ili sistem; spisak drugih elemenata sistema
- da li drugi elementi imaju isti izgled (sloj, boja)
- kompatibilnost sa tuđim proizvodima

**NE PIŠITE**
- ne opisujte tuđe proizvode kao deo vašeg dizajna
- ne zaključujte da modularni izuzetak „sigurno važi“ — NEPROVERENO (P-10)


---

## Grupa F — Varijante proizvoda

_Osnova za odluku: jedna, više ili višestruka prijava (svaka varijanta = poseban opis, prikazi i taksa)._

### F1 · `F1_VARIANTS_SIZE_TEXTURE_COLOR` · obavezno

**PITANJE**
Da li postoje varijante panela po dimenzijama, po teksturi prednje površine ili po boji? Navedite svaku varijantu i šta se tačno u izgledu menja, a šta ostaje isto.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Svaka varijanta koja menja izgled može biti poseban dizajn sa sopstvenim opisom, prikazima i taksom, u jednoj višestrukoj prijavi (ista potklasa, do 100 dizajna) ili u više prijava (MZ-045, MZ-120 – MZ-124, MZ-080).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Dimenzije: panel se izrađuje u [dve] veličine, [dužina × visina] i [dužina × visina], sa istim odnosom stranica [2 : 1] i istom debljinom; profil ivica i izgled površine su isti. Tekstura: postoje [dve] teksture, [sitno zrnasta] i [brazdasta, sa uspravnim brazdama]; sve ostalo je isto. Boja: završni sloj se nudi u [tri] nijanse: [bela, svetlo siva, antracit], uz isto [belo] telo ploče. Varijante koje bismo želeli da zaštitimo: [sve / samo osnovnu, sivu sitno zrnastu]. Smatramo da je [tekstura] bitna za izgled, a [boja] manje.

**OBAVEZNO POMENITE**
- svaka vrsta varijante posebno: dimenzije, tekstura, boja
- za svaku: šta se menja, šta ostaje isto
- da li se proporcije menjaju sa dimenzijom
- koje varijante želite da obuhvatite prijavom
- koja razlika je po vašem mišljenju bitna za izgled

**NE PIŠITE**
- ne odlučujte sami o jednoj, više ili višestrukoj prijavi — to je faza 6 uz citirano pravilo (MZ-122, NS-10)
- ne navodite varijante koje ne postoje i nisu planirane

### F2 · `F2_VARIANTS_EDGE_CORNER_END` · obavezno

**PITANJE**
Da li postoje varijante po profilu ivica, ugaoni paneli, početni ili završni paneli, ili dekorativne varijante (ukrasni elementi, drugačiji raster)? Opišite izgled svake.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Ugaoni, početni i završni elementi su verovatno posebni dizajni ili posebni proizvodi; za svaki treba znati da li ima vidljive razlike u izgledu (MZ-122, MZ-124, MZ-045).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Profil ivica: postoji [samo jedan profil / i varijanta sa ravnim dužim ivicama za poslednji red]. Ugaoni panel: [postoji; to je ploča savijena pod pravim uglom, sa oba kraka pokrivena istim završnim slojem, kraćeg kraka dužine približno jedne trećine dužeg / ne postoji; uglovi se rešavaju sečenjem običnih ploča]. Početni i završni panel: [postoje, imaju jednu ravnu dužu ivicu bez stepenika / ne postoje]. Dekorativne varijante: [ne postoje / postoji varijanta sa žljebovima iz D13]. Nazivi varijanti za internu upotrebu: [osnovni, ugaoni, završni].

**OBAVEZNO POMENITE**
- svaka vrsta posebno: profil ivica, ugaoni, početni/završni, dekorativni
- za svaki element: oblik, da li nosi isti završni sloj, proporcije u odnosu na osnovni panel
- koje od njih želite da obuhvatite prijavom

**NE PIŠITE**
- ne opisujte kako se ugaoni element montira — samo kako izgleda (MZ-042)

### F3 · `F3_MARKET_LAUNCH_DEFERRAL_ABROAD` · opciono

**PITANJE**
Da li je planiran datum izlaska na tržište ili predstavljanja (sajam, katalog, sajt)? Da li želite da izgled ostane neobjavljen do tada? Da li planirate zaštitu i van Srbije?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Odloženo objavljivanje do 12 meseci se traži u D-1 (polje 8); planirano izlaganje otvara sajamsko prvenstvo; zaštita van Srbije ima rok od 6 meseci od podnošenja (MZ-130, MZ-162, MZ-164).

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Izlazak na tržište planiramo za [mesec, godina]; prvo predstavljanje bi bilo [na sajmu … / u katalogu / na sajtu]. Do tada [želimo / ne želimo] da izgled ostane neobjavljen. Zaštitu van Srbije [razmatramo za zemlje … / ne planiramo]; rok od 6 meseci nam je poznat. Da li odlaganje objave košta nije nam poznato (NEPROVERENO, P-07).

**OBAVEZNO POMENITE**
- planirani datum i mesto prvog predstavljanja
- želja za odloženim objavljivanjem
- zemlje u kojima se razmatra zaštita

**NE PIŠITE**
- ne pretpostavljajte da je odlaganje besplatno (MZ-132)
- ne mešajte planirano buduće predstavljanje sa prethodnim objavljivanjem — ono je grupa G


---

## Grupa G — Prethodno javno objavljivanje — VISOK PRIORITET

_Sve što je ikada javno prikazano pre podnošenja utiče na novost i na rok za podnošenje. Nijedno pitanje iz ove grupe ne sme ostati bez odgovora._

### G1 · `G1_PRIOR_PUBLIC_DISCLOSURE` · obavezno · **VISOK PRIORITET**

**PITANJE**
Da li je ovaj panel, njegov render, fotografija, tehnički crtež ili prototip ikada javno objavljen pre podnošenja prijave? Mislimo na: web sajt, Instagram, Facebook, LinkedIn, katalog, sajam, proizvođača, kupca, dobavljača, marketplace, javnu prezentaciju. Za SVAKO objavljivanje navedite: datum, mesto, publiku, šta je tačno prikazano i da li je postojao NDA ili druga obaveza poverljivosti.

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Svaka ranija javna pojava ugrožava novost; sopstveno otkrivanje ne šteti samo ako je od prve objave do podnošenja prošlo manje od 12 meseci, a otkrivanje pod obavezom tajnosti se ne računa (MZ-171, MZ-173, MZ-174, MZ-175). VISOK PRIORITET.

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Objava 1: [15. 3. 2026], fotografija uzorka postavljena na [Instagram profil firme], javno dostupna svima; prikazana je prednja površina i deo ivice sa stepenikom; bez NDA. Objava 2: [april 2026], tri ploče ugrađene na [probnoj fasadi na adresi …], vidljive sa ulice; bez NDA. Objava 3: [10. 1. 2026], tehnički crtež profila poslat [proizvođaču alata, naziv] e-mailom; postoji potpisan NDA od [datum]. Objava 4: [datum], prezentacija rendera [kupcu / investitoru …], usmeni dogovor o poverljivosti, bez pisanog NDA. Prva javna objava bez NDA je dakle [15. 3. 2026]. / Alternativa: Panel, renderi, crteži i prototip nikada nisu javno prikazani; videli su ih samo [autor i zaposleni], svi sa obavezom poverljivosti po [ugovoru o radu].

**OBAVEZNO POMENITE**
- svako objavljivanje kao posebna stavka: datum, mesto/kanal, publika
- šta je tačno bilo prikazano (cela ploča, samo površina, samo crtež profila)
- NDA ili druga obaveza poverljivosti: pisana, usmena, nikakva
- izričito navedite najraniji datum javne objave bez poverljivosti
- i „ne, nikada“ je odgovor — ali ga napišite izričito, sa objašnjenjem ko je sve video proizvod

**NE PIŠITE**
- ne preskačite objave koje vam se čine beznačajnim (probna fasada, story od 24 sata, slanje uzorka kupcu) — sve se beleži, procenu daje faza analize
- ne menjajte datume „na sigurno“ — navedite tačan datum ili raspon i označite nesigurnost

### G2 · `G2_PRIOR_APPLICATIONS` · obavezno · **VISOK PRIORITET**

**PITANJE**
Da li je za ovaj panel ranije podneta bilo koja prijava — patent, mali patent, industrijski dizajn ili žig — u Srbiji ili u inostranstvu? Ako jeste: kada, gde, pod kojim brojem i da li je objavljena?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Objavljena ranija prijava bilo kog oblika može biti ranija objava koja ugrožava novost; ranija prijava dizajna u inostranstvu daje konvencijsko prvenstvo u roku od 6 meseci (MZ-161, MZ-175). VISOK PRIORITET.

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Podneta je prijava [patenta / malog patenta] ZIS-u [datum], broj [P-…], koja [jeste / nije] objavljena; objava je bila [datum] u Glasniku intelektualne svojine. Prijava sadrži [crteže profila ivica u preseku / fotografije uzorka]. Prijava dizajna u inostranstvu nije podnošena. Prijava žiga za naziv [naziv] podneta je [datum] i ne sadrži slike panela. / Alternativa: Nikakva prijava za ovaj panel nije ranije podneta, ni u Srbiji ni u inostranstvu.

**OBAVEZNO POMENITE**
- svaka prijava posebno: vrsta prava, zavod, datum, broj
- da li je objavljena i kada
- šta prijava sadrži od slika i crteža panela
- ako postoji prijava dizajna u inostranstvu: tačan datum (rok 6 meseci)

**NE PIŠITE**
- ne prepisujte tekst iz patentne prijave kao odgovor o izgledu — ZIS je na to izričito upozorio (e-mail ZIS-a u pravilima projekta)
- ne pretpostavljajte da patentna prijava postoji ako niste sigurni; proverite broj

### G3 · `G3_FAIR_EXHIBITION_LAST_3_MONTHS` · obavezno · **VISOK PRIORITET**

**PITANJE**
Da li je panel izlagan na sajmu ili izložbi u poslednja tri meseca? Na kom sajmu, kada, i da li možete da pribavite potvrdu organizatora ili Privredne komore?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Izlaganje na međunarodnom sajmu u roku od 3 meseca pre podnošenja daje sajamsko pravo prvenstva uz potvrdu nadležnog organa; sajamsko prvenstvo ne produžava rokove konvencijskog prvenstva (MZ-162, MZ-163). VISOK PRIORITET.

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Panel je izlagan na sajmu [naziv sajma], [grad], od [datum] do [datum], na štandu [izlagač]; izložena je [cela ploča sa svim ivicama / samo uzorak površine]. Potvrdu organizatora [možemo / ne možemo] da pribavimo; nismo još tražili potvrdu Privredne komore Srbije. / Alternativa: Panel nije izlagan ni na jednom sajmu ni izložbi.

**OBAVEZNO POMENITE**
- naziv i mesto sajma, tačan datum prvog dana izlaganja
- šta je bilo izloženo
- ko je bio izlagač (vi ili partner)
- dostupnost potvrde

**NE PIŠITE**
- ne računajte da sajamsko prvenstvo produžava rok od 12 meseci iz G1 — rokovi se ne sabiraju (MZ-163)

### G4 · `G4_DISCLOSURE_EVIDENCE` · obavezno · **VISOK PRIORITET**

**PITANJE**
Da li postoje sačuvani dokazi o objavama iz G1 i G3 (skrinšotovi sa datumom i URL-om, štampani katalozi, e-mailovi, fotografije sa sajma)? Možete li ih dostaviti?

**ZAŠTO JE OVA INFORMACIJA POTREBNA**
Datum sopstvene objave se dokazuje odštampanim primerkom ili skrinšotom sa jasnom slikom, datumom i URL-om, a prednost imaju arhivski servisi; dokazi određuju krajnji rok za podnošenje (MZ-175). VISOK PRIORITET.

**UZORNI ODGOVOR (šablon — zamenite `[…]` svojim podacima)**
> Za objavu na [Instagramu] imamo skrinšot sa vidljivim datumom i nazivom profila; URL objave je [adresa]. Za probnu fasadu imamo fotografije sa [datumom u metapodacima]. Za slanje crteža proizvođaču imamo e-mail od [datum] i potpisan NDA. Katalog iz [godina] postoji u štampanom obliku, [broj] primeraka podeljeno na [mestu]. Sve možemo da dostavimo kao PDF/sliku. / Alternativa: Objava nije bilo, pa dokaza nema.

**OBAVEZNO POMENITE**
- za svaku objavu iz G1 i G3: koji dokaz postoji
- da li dokaz pokazuje datum, URL i sliku
- format u kome možete da dostavite
- šta nemate sačuvano

**NE PIŠITE**
- ne brišite i ne menjajte ranije objave radi „čišćenja“ — to ne poništava objavu, a uništava dokaz o datumu


---

## Tri para „loš → dobar“ (za primere koje je podnosilac naveo)

### Prednja površina (pitanja D3, D4, D5)

**Loš (trenutno u aplikaciji):** „Fina zrnasta tekstura, mat završni sloj, svetlosiva boja.“

_Zašto je loš:_ Tri prideva bez proporcija, bez odnosa prema ivicama i bez oznake elementa. Iz ovoga Pisac Prijave ne može da napiše ni jedan stav opisa usklađen sa prikazom (MZ-041), niti da zna da li tekstura ide do ivice i kako se sloj vidi na ivici.

**Dobar (šablon):**
> Prednja površina (1) je ravna i po celoj veličini nosi završni sloj sa ujednačenom, sitno zrnastom reljefnom teksturom, po izgledu sličnom [zaribanom malteru]; zrna su [manja od zrna pirinča], raspoređena ravnomerno, bez pravca i bez motiva. Površina je mat, bez odsjaja, [svetlo sive] nijanse [RAL 7035], jednobojna. Tekstura i boja idu do samih ivica, bez glatkog oboda. Na ivicama (3, 4) se završni sloj vidi kao tanka [siva] traka (6), debljine približno [jedne dvadesetine] debljine ploče, na [beloj] podlozi tela, i to je jedini kontrast boje na ploči. Pod kosim svetlom reljef daje [blagu] igru sitnih svetlih i tamnih tačaka.

_Zašto je dobar:_ Imenovan je element (1) i njegov odnos prema ivicama (3, 4, 6); krupnoća je data poređenjem, proporcija sloja rečima; nema sastava ni svojstava; sve što je rečeno može se videti na prikazu.

### Ivice i spojevi (pitanja D1, D7, D8, D9, D10, D11)

**Loš (trenutno u aplikaciji):** „Stepenasti profil na dužim ivicama, sa ravnim kratkim ivicama.“

_Zašto je loš:_ Ne kaže koliko stepenika, kog smera, kakvih proporcija, kako izgleda kontura sa strane, gde se završava sloj ni kako se stepenik završava na uglu. Reč „spoj“ vuče ka funkciji, koju opis ne sme da sadrži (MZ-042).

**Dobar (šablon):**
> Duže ivice (3) su profilisane po jednim stepenikom (5) svaka, suprotnog smera: na gornjoj ivici (3a) prednji deo debljine je izbačen nagore, na donjoj (3b) zadnji deo debljine je izbačen nadole, tako da je kontura ploče u pogledu sa kraće strane u obliku slova „Z“. Visina stepenika je približno [polovina] debljine ploče, širina približno [jednaka visini]; ivice stepenika su prave i oštre. Završni sloj (1) [je odsečen u ravni prednje površine], pa se na obe duže ivice vidi kao tanka traka (6). Kraće ivice (4) su ravne, upravne na prednju površinu, bez profila, sa istom trakom sloja na gornjem rubu. Stepenik [ide do samog kraja ploče], pa su sva četiri ugla u pogledu spreda prava i oštra. Prelaz prednje površine ka dužim ivicama [je oboren pod približno 45° u širini od približno jedne desetine debljine / je prav].

_Zašto je dobar:_ Svaka ivica je posebno imenovana i opisana geometrijski (smer, proporcija, kontura), uglovi i zakošenja su obuhvaćeni, ništa ne govori čemu stepenik služi. Odgovara redosledu „celina → delovi određenim redom“ iz primera BOCE (MZ-047, MZ-048).

### Varijante boja (pitanja F1, D4)

**Loš (trenutno u aplikaciji):** „Da, tri boje završnog sloja: bela, svetlosiva, antracit.“

_Zašto je loš:_ Ne kaže šta se osim boje menja, da li je boja deo dizajna, da li telo ploče ostaje isto, ni koje varijante treba obuhvatiti prijavom. Bez toga faza 6 ne može da odluči o jednoj, više ili višestrukoj prijavi (MZ-122, MZ-124).

**Dobar (šablon):**
> Završni sloj se nudi u tri nijanse: [bela, RAL 9010], [svetlo siva, RAL 7035] i [antracit, RAL 7016]. Kod sve tri varijante oblik ploče, profil ivica, tekstura i debljina sloja su potpuno isti; menja se samo boja sloja. Telo ploče je u svim varijantama [belo], pa je kod bele varijante traka sloja na ivicama (6) jedva vidljiva, a kod antracit varijante je najizraženija. Boju ne smatramo glavnim obeležjem dizajna; glavno je oblik ivica i tekstura. Prijavom bismo obuhvatili [osnovnu sivu varijantu, a prikaze dali u boji / sve tri varijante, ako je to moguće u istoj prijavi — nismo sigurni].

_Zašto je dobar:_ Jasno je šta je stalno, a šta promenljivo, kako boja utiče na vidljivost drugih elemenata (6), i šta podnosilac želi; odluku o obliku prijave ostavlja fazi 6 uz pravilo.
