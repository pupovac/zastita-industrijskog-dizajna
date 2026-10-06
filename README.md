# Zaštita industrijskog dizajna – EPS fasadni panel

Priprema prijave za priznanje prava na industrijski dizajn pred Zavodom za intelektualnu svojinu Republike Srbije (ZIS).

Repozitorijum sadrži i web aplikaciju koja vodi kroz pripremu prijave kao strukturisani wizard (14 koraka), sa
trajnom, strukturisanom memorijom projekta.

Sistem pomaže u pripremi prijave i dokumentacije. Nije zamena za registrovanog zastupnika za intelektualnu
svojinu ili advokata, ne garantuje prihvatanje prijave i nikada je ne podnosi automatski.

## Struktura

```
apps/api   NestJS (jedna aplikacija) + Prisma (SQLite)
apps/web   React + TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, shadcn/ui
```

- `docs/izvori/` — evidencija zvaničnih izvora (Faza 1)
- `docs/faza-2/` — Matrica zahteva ZIS-a (MD, JSON, CSV) i „Rezultati inicijalnog istraživanja" A–N (Faza 2)

## Pokretanje lokalno

Potrebno: Node.js 20+.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:migrate          # primenjuje migracije na praznu bazu apps/api/prisma/dev.db
npm run db:import:research  # uvozi rezultate faza 1–2 (docs/) u sve projekte; može se ponavljati
npm run db:seed:demo        # pravi (ili ponovo pravi) samo projekat „[DEMO] EPS fasadni panel – mock podaci"
npm run dev                 # API na :3000, web na :5173
```

Otvorite http://localhost:5173.

Provere:

```bash
npm run typecheck           # tsc --noEmit za api i web
npm test                    # jest (api, uključujući e2e nad posebnom test bazom) + vitest (web)
```

## Ključna pravila koja sprovodi backend

Logika je u `apps/api/src/domain/` i pokrivena je unit testovima.

- **Promocija činjenica** (`fact-rules.ts`): AI zaključak ili izjava postaje `FACT` / „POTVRĐENA ČINJENICA
  KORISNIKA" samo preko `POST /api/facts/:id/confirm` sa `{ "explicitUserConfirmation": true }` i samo kada
  zahtev šalje korisnik. Nijedan ulazni DTO nema polje `verified`. Izmena potvrđene vrednosti briše potvrdu;
  agent potvrđenu vrednost ne može da menja. Preporuka se nikada ne pretvara u činjenicu.
- **Status koraka** (`step-status.ts`): dozvoljeni prelazi su zatvoren graf; korak ne može da započne dok
  prethodni nije `APPROVED` (nema preskakanja faza); odobrava samo korisnik; blokada zahteva razlog; korak sa
  otvorenim blokirajućim pitanjima ili konfliktima ne ide na pregled; ponovno otvaranje odobrenog koraka
  blokira sve kasnije započete korake. Svaka promena se beleži u `StepStatusEvent`.
- **Konflikti između dokumenata** (`conflict-rules.ts`): neslaganje (npr. fotografija vs. tehnički crtež) se
  označava i vraća korisniku; razrešava ga isključivo korisnik, a izbor se beleži kao `Decision`. Činjenice se
  ne menjaju automatski.

### Ko šalje zahtev

U ovoj fazi nema autentifikacije. Pozivalac se deklariše zaglavljem `X-Actor-Type: USER | AGENT`. Sve osim
eksplicitnog `USER` tretira se kao `AGENT` (najmanje privilegija). Web UI uvek šalje `USER`. Pre produkcije ovo
treba zameniti pravom autentifikacijom.

## Prelazak na PostgreSQL

Šema koristi samo prenosive tipove (`String`, `Int`, `Float`, `Boolean`, `DateTime`) i Prisma enume, bez
`@db.*` atributa i bez sirovog SQL-a. Prelazak: promeniti `provider` u `apps/api/prisma/schema.prisma` na
`postgresql`, postaviti `DATABASE_URL`, obrisati `prisma/migrations` i generisati novu početnu migraciju
(`npx prisma migrate dev --name init`). Polja `...Json` (JSON tekst) mogu se tada prebaciti na tip `Json`.

## Otpremanje dokumenata

Podržano: PDF, DOCX, PNG, JPG/JPEG, SVG (CAD prikazi izvezeni u te formate). Sadržaj se proverava prema
ekstenziji. Original se čuva bajt-po-bajt u `UPLOAD_DIR` (podrazumevano `apps/api/storage/uploads`) sa SHA-256
otiskom; zatim se izvlače tekst i metapodaci. Ako obrada ne uspe, original ostaje sačuvan, a dokument se
prikazuje kao „Potrebna ručna provera" — sistem ne nastavlja kao da je dokument analiziran.

## Rezultati faza 1–2 u bazi

`POST /api/projects/:projectId/research/import` (ili `npm run db:import:research [-- --project <id>]`) uvozi iz
`docs/` zapise izvora Z-01 … Z-15 (sa institucijom, verzijom, datumom pristupa i lokalnim kopijama), nalaze iz
zapisa, Matricu zahteva ZIS-a (128 zahteva, sa statusom POTVRĐENO/NEPROVERENO, klasifikacijom, oblašću, fazama,
neusklađenostima i svim citiranim izvorima) i „Rezultate inicijalnog istraživanja" (A.1–A.10, B–N). Uvoz je
idempotentan: zapisi se prepoznaju po oznakama (Z-xx, MZ-xxx, NS-xx, A.1 …) i ažuriraju na mestu; potvrde korisnika
se ne diraju. Pravila se čuvaju kao kopija po projektu (vidi opis PR-a FUZZ-130).

## Demo projekat i mock podaci

`npm run db:seed:demo` briše i ponovo pravi samo projekte sa `isDemo = true`. Stvarni projekti se ne menjaju.
Svaki mock zapis nosi `sourceReference: "MOCK"`, a backend odbija mock zapis u stvarnom projektu
(`MOCK_DATA_IN_REAL_PROJECT`). UI demo projekta prikazuje traku „DEMO – izmišljeni podaci, ne koristiti za prijavu",
a generisani DOCX i PDF nose vodeni žig „DEMO".

## API za agente

Agent šalje `X-Actor-Type: AGENT`. Nijedan ulazni DTO nema polje `verified`; potvrda je uvek
`POST …/confirm` sa `{ "explicitUserConfirmation": true }` i samo od korisnika. Potvrđen zapis agent ne može da
menja ni briše. Usvojena PREPORUKA se beleži kao odluka korisnika, ne kao činjenica.

### Kolekcije (isti oblik za sve)

| Kolekcija | Entitet | Korak |
|---|---|---|
| `sources`, `source-documents`, `research-findings` | Source, SourceDocument, ResearchFinding | 2 |
| `source-requirements` | SourceRequirement (Matrica) | 3 |
| `design-features`, `design-variants` | DesignFeature, DesignVariant | 6, 8 |
| `prior-designs`, `search-coverage` | PriorDesign, izveštaj o pokrivenosti | 7 |
| `representations` | Representation | 9 |
| `agent-tasks` | AgentTask | svi |

```
GET    /api/projects/:projectId/<kolekcija>
POST   /api/projects/:projectId/<kolekcija>
PATCH  /api/<kolekcija>/:id
DELETE /api/<kolekcija>/:id
POST   /api/<kolekcija>/:id/confirm        (samo korisnik)
```

### Ostali endpointi

| Endpoint | Namena |
|---|---|
| `GET /api/step-definitions`, `GET /api/interview-groups` | koraci 1–14, grupe intervjua A–G |
| `GET/POST /api/projects/:id/questions`, `PATCH /api/projects/:id/questions/:qid`, `PUT /api/projects/:id/answers/:qid` | pitanja (sa `interviewGroup`) i odgovori |
| `GET/POST /api/projects/:id/facts`, `PATCH /api/facts/:id`, `POST /api/facts/:id/confirm` | činjenice sa poreklom |
| `GET/POST /api/projects/:id/files`, `POST /api/files/:id/replace`, `DELETE /api/files/:id`, `GET /api/files/:id/content` | dokumenti (zamena čuva original) |
| `POST /api/projects/:id/conflicts`, `POST /api/review-issues/:id/resolve-conflict` | neslaganja dokumenata |
| `GET /api/projects/:id/requirements?area=&phase=&status=&discrepancy=` | Matrica zahteva sa filterima |
| `GET /api/projects/:id/research-report`, `GET /api/sources/:id/local-copies/:n` | Rezultati istraživanja, lokalne kopije |
| `GET /api/function-analysis/questions`, `PUT /api/design-features/:id/function-analysis/:n`, `POST …/:n/confirm` | modul „Tehnička funkcija naspram vizuelnog dizajna" (8 pitanja) |
| `GET /api/projects/:id/strategy`, `PUT /api/projects/:id/strategy/:key`, `POST …/:key/confirm` | strategija zaštite (`FILING_TYPE`, `VARIANT_RESOLUTION`, `DEFERRED_PUBLICATION`, `PRIORITY_CLAIM`) |
| `GET/POST /api/projects/:id/application-sections`, `PUT /api/application-sections/:id/working-draft`, `POST …/versions`, `GET …/versions`, `POST …/confirm` | sekcije opisa i istorija verzija |
| `POST /api/terminology-check` | provera patentne terminologije za bilo koji tekst |
| `GET/POST /api/projects/:id/review-issues`, `PATCH /api/review-issues/:id`, `POST /api/review-issues/:id/status`, `GET /api/review-checks` | nalazi nezavisne provere (BLOCKER/HIGH/MEDIUM/LOW), 17 provera |
| `GET /api/projects/:id/d1`, `PUT /api/projects/:id/d1/:fieldKey`, `POST …/:fieldKey/confirm` | podaci za D-1 |
| `GET /api/projects/:id/package`, `POST /api/projects/:id/package/generate`, `GET /api/generated-documents/:id/content` | checklista §16, generisanje 9 dokumenata, istorija verzija |
| `GET/POST /api/projects/:id/signoffs` | završni pregled podnosioca/zastupnika (samo korisnik) |
| `GET/POST /api/projects/:id/open-questions`, `POST /api/open-questions/:id/answer`, `GET/POST /api/projects/:id/decisions` | otvorena pitanja i odluke |
| `GET /api/projects/:id/knowledge` | panel „Znanje o projektu" |

### Primeri poziva po fazama 4–10

```bash
API=http://localhost:3000/api; P=<projectId>; H='-H Content-Type:application/json -H X-Actor-Type:AGENT'

# Faza 4 — vizuelne karakteristike (kategorija A–D, rizik) i jedno od 8 pitanja
curl $H -X POST $API/projects/$P/design-features -d '{"name":"Stepenasti profil dužih ivica","kind":"AI_INFERENCE",
  "sourceType":"AGENT_INFERENCE","category":"B_MIXED","functionalityRisk":"NEEDS_FURTHER_REVIEW",
  "categoryRationale":"Profil služi spajanju, ali je izgled biran i estetski."}'
curl $H -X PUT $API/design-features/<featureId>/function-analysis/4 -d '{"answer":"Isti spoj moguć je i sa drugim profilom."}'

# Faza 5 — pretraga: zapis o pokrivenosti i pronađeni dizajn (rezultat odvojen od pravnog zaključka)
curl $H -X POST $API/projects/$P/search-coverage -d '{"database":"EUIPO DesignView","status":"BLOCKED",
  "blockedReason":"Automatsko čitanje nije moguće","coverageGap":"EU dizajni nisu pretraženi","sourceType":"AGENT_INFERENCE"}'
curl $H -X POST $API/projects/$P/prior-designs -d '{"title":"Fasadna ploča","registrationNumber":"D-…","database":"ZIS",
  "similarityLevel":"MEDIUM","searchResult":"Pronađeno pretragom klase 25-01.","legalConclusion":"Nije konačno.",
  "kind":"AI_INFERENCE","sourceType":"ZIS","sourceReference":"https://e-reg.zis.gov.rs/…"}'

# Faza 6 — strategija zaštite sa obrazloženjem i izvorom iz Matrice
curl $H -X PUT $API/projects/$P/strategy/FILING_TYPE -d '{"value":"SINGLE","rationale":"…","requirementRefs":"MZ-120, MZ-123"}'

# Faza 7 — plan prikaza i ocena dostavljene slike
curl $H -X POST $API/projects/$P/representations -d '{"viewName":"Perspektivni prikaz","requirement":"MANDATORY",
  "purpose":"Ukupan oblik","featureShown":"odnos površina","medium":"RENDER","sourceType":"AGENT_INFERENCE"}'
curl $H -X PATCH $API/representations/<id> -d '{"assessment":"NEEDS_REWORK","assessmentNote":"Ukloniti kote."}'

# Faza 8 — nacrt opisa (svaka verzija se čuva i proverava na patentnu terminologiju) i D-1
curl $H -X POST $API/application-sections/<sectionId>/versions -d '{"content":"…","sourceType":"AGENT_INFERENCE"}'
curl $H -X PUT $API/projects/$P/d1/PRODUCT_TITLE -d '{"value":"Fasadni panel","sourceType":"AGENT_INFERENCE"}'

# Faza 9 — nalaz nezavisne provere i njegovo rešavanje
curl $H -X POST $API/projects/$P/review-issues -d '{"severity":"BLOCKER","title":"Opis i prikazi se ne slažu",
  "stepKey":"DESCRIPTION_DRAFTING","checkKey":"DESCRIPTION_MATCHES_REPRESENTATIONS"}'
curl $H -X POST $API/review-issues/<id>/status -d '{"status":"RESOLVED","note":"Opis ispravljen u verziji 3."}'

# Faza 10 — finalni paket (odbija se dok postoji nerešen BLOCKER ili patentna terminologija u opisu)
curl $H -X POST $API/projects/$P/package/generate
```

### Pravila za korake 11–14

- Korak 13 „Finalni paket prijave" ne može da započne, ode na pregled niti bude odobren dok postoji nerešen nalaz
  BLOCKER (`FINAL_PACKAGE_BLOCKED_BY_BLOCKER`); isto pravilo važi i za generisanje paketa.
- Paket se generiše kao NACRT dok nisu ispunjene sve kontrolne tačke iz §16, potvrđene obavezne sekcije opisa i
  popunjena sva polja D-1; tek tada je FINALNA VERZIJA. Svaka generacija dodaje novu verziju svih 9 dokumenata.
- Svaki generisani dokument nosi napomenu da sistem ne garantuje prihvatanje prijave i da je ne podnosi automatski.
