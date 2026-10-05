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
