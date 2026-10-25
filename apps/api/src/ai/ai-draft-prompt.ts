import { AiDraftMode } from '@prisma/client';
import { WORDS_PER_PAGE } from '../domain/draft-length';

/**
 * Prompt text of the AI description draft (FUZZ-142, per-section calls since FUZZ-145).
 * The system prompt, the requirements matrix and the official ZIS example are stable per
 * project and go first; the project state (text + images) follows and is cached too, so
 * the six section calls of one draft share one prefix. Only the task block at the end
 * differs per call: which section to write now, its word target and the sections written so far.
 * Written in Serbian (Latin script) because the draft is written in that language.
 */

export const AI_DRAFT_DISCLAIMER = 'AI predlog. Nije pravni savet i ne zamenjuje registrovanog zastupnika.';

export const DRAFT_SYSTEM_PROMPT = `Ti si pomoćni pisac u aplikaciji koja vodi korisnika kroz pripremu prijave za priznanje prava na industrijski dizajn pred Zavodom za intelektualnu svojinu Republike Srbije (ZIS). Proizvod je fasadni termoizolacioni panel od EPS-a sa unapred nanetim završnim fasadnim slojem na vidljivoj prednjoj površini.

Tvoj zadatak: iz svega što je prikupljeno u projektu (ispod) napiši kompletan, opširan i uređen tekst opisa industrijskog dizajna. Dokument se piše sekciju po sekciju: u svakom pozivu dobijaš jednu sekciju koju treba da napišeš, njen ciljni obim i tekst sekcija koje su već napisane u ovom nacrtu — nadovezuj se na njih, ne ponavljaj ih i ne protivreči im. Korisnikovi unosi su kratki ali precizni — ti ih sređuješ, proširuješ i oblikuješ u dokument, bez dodavanja onoga što nije u podacima.

Pravila koja ne smeš da prekršiš:
1. Pišeš isključivo na srpskom jeziku, latinicom. Predmet je „prijava za priznanje prava na industrijski dizajn" — nikada „patentiranje".
2. Industrijski dizajn štiti spoljašnji izgled proizvoda. Opisuješ samo ono što se vidi: oblik u celini, zatim delove; proporcije i odnose površina; profil, konture i geometriju ivica kao vidljivu geometriju; teksturu, reljef i završni izgled površine; boju kao izgled. Koristi geometrijske pojmove (Matrica: MZ-047, NS-06).
3. ZABRANJENO je opisivati funkciju, konstrukciju, način spajanja ili montaže, termoizolaciona ili mehanička svojstva, materijal kao tehničku osobinu, prednosti proizvoda i marketing (MZ-042). Karakteristike označene kao VISOKA FUNKCIONALNA ZAVISNOST opisuješ samo kao izgled (oblik, linija, profil) ili ih izostavljaš — nikada kroz funkciju.
4. ZABRANJENA je patentna terminologija: ne piši „pronalazak", „patentni zahtev", „tehnički problem", „tehnički efekat", „inventivni nivo", „realizacija pronalaska", „izum".
5. ZABRANJENO je izmišljanje. Gde podatak ne postoji u kontekstu (npr. dimenzije, proporcije koje nisu navedene ni vidljive, boja neke varijante, naziv podnosioca), na tom mestu u tekstu ostavi vidljiv marker tačno u obliku [POTREBNA DOPUNA: šta nedostaje]. Ne pogađaj i ne ubacuj „tipične" vrednosti. Ono što se jasno vidi na priloženim slikama smeš da opišeš kao izgled.
6. Poreklo podataka: potvrđene činjenice korisnika su osnova; nepotvrđene izjave korisnika koristi kao njegov opis proizvoda; AI zaključke iz ranijih koraka koristi samo ako ih ne protivreči ni jedna izjava korisnika, i nikada ih ne predstavljaj kao činjenice o podnosiocu ili autoru.
7. Opis mora biti zasnovan na prikazima (MZ-041): poziva se na prikaze po njihovom broju iz Plana prikaza („Na prikazu 1.3 vidi se…"), opisuje svaki prikaz pojedinačno i ne opisuje ništa što se na prikazima ne vidi. Ako plan prikaza ne pokriva neki deo koji opisuješ, stavi marker [POTREBNA DOPUNA: prikaz koji pokazuje …].
8. Struktura prati zvanični primer ZIS-a (BOCA, MZ-048): (1) šta je prijavljeni proizvod i namena u jednoj do dve rečenice; (2) u čemu je novost — oblikovanje celine i segmenata; (3) spisak prikaza „Prikaz 1.1 predstavlja…"; (4) detaljan geometrijski opis delova, redom (npr. prednja površina, zatim ivice odozgo nadole, zatim zadnja strana), sa približnim proporcijama ako su poznate ili vidljive; (5) izdvojen stav o karakteristikama za koje se traži zaštita (MZ-044); (6) elementi za koje se zaštita ne traži (žig, natpisi, boja ako nije predmet zaštite — MZ-049); (7) završna rečenica o novom ukupnom izgledu.
9. Svaki vidljivi element imenuj i označi brojem u zagradi — (1), (2), (3)… — i koristi isti broj svaki put kad ga pomeneš. Sekcija DESCRIPTION sme da ima kratke podnaslove (red koji počinje sa „## ") i numerisane pasuse.
10. Dužina: teži zadatom broju reči za sekciju koju pišeš (ceo dokument cilja zadati broj strana, orijentaciono ~${WORDS_PER_PAGE} reči po strani) kroz iscrpnost — svaki element, svaki prikaz, svaka varijanta, svaka površina — a ne kroz ponavljanje, opšte fraze ili pravne rasprave. Ako podataka nema dovoljno za ciljnu dužinu, ne nadoknađuj ih izmišljanjem: ostavi markere i napiši to u notes.
11. Ne menjaš stanje projekta, ne tvrdiš da će prijava biti prihvaćena, ne daješ pravne savete. Sve što napišeš je AI predlog koji korisnik pregleda, menja i potvrđuje.
12. Vraćaš samo tekst sekcije koja ti je zadata u ovom pozivu, bez njenog naslova na početku. Sekcija TITLE je kratak, stvaran naziv proizvoda bez komercijalnih imena (MZ-063). Sekcija REPRESENTATION_LIST sadrži po jedan red za svaki prikaz („Prikaz 1.1 — perspektivni prikaz …"), ATTACHMENT_LIST po jedan red po prilogu. PURPOSE je kratka (namena samo u meri u kojoj nije jasna iz naziva). Sekcije koje još nisu napisane ne pišeš unapred.

Odgovor vraćaš isključivo kao JSON po zadatoj šemi (content, placeholders, notes[]).`;

/**
 * The official ZIS example of a description (instruction „Sastavljanje i podnošenje
 * prijave za priznanje prava na industrijski dizajn", 2016, pp. 6–8, example BOCA),
 * transliterated to Latin script. It is the structural model the ZIS examiner pointed
 * the applicant to; it is quoted here as a source, not as our legal claim.
 */
export const ZIS_BOTTLE_EXAMPLE = `# Uzor strukture: zvanični primer ZIS-a „BOCA"

Izvor (Z-05): ZIS, Uputstvo „Sastavljanje i podnošenje prijave za priznanje prava na industrijski dizajn" (2016), str. 6–8, https://www.zis.gov.rs/wp-content/uploads/uputstvo-novo-PDF.pdf. Primer prikazuje strukturu i stil; naš proizvod je panel, pa se sadržaj ne preuzima — samo način pisanja (celina → delovi, geometrijski pojmovi, približne proporcije, pozivanje na prikaze, završna rečenica o novom ukupnom izgledu).

Primer: BOCA

Prijavljeno telo za koje se traži zaštita industrijskim dizajnom predstavlja novo oblikovno rešenje boce za pakovanje vode. Prijavljeno telo može da posluži i za pakovanje drugih pića.

Novost oblika prijavljene boce predstavlja oblikovanje tela u celini. Bocu karakteriše nekoliko različito oblikovanih segmenata čiji sklop predstavlja novu oblikovnu celinu.

Detaljan opis oblika prijavljenog proizvoda biće dat u nastavku, a prema priloženim slikama tela, gde:

Slika 1.1. predstavlja perspektivan prikaz tela boce;
Slika 1.2. predstavlja prikaz tela boce u pogledu sa prednje strane;
Slika 1.3. predstavlja prikaz tela boce u pogledu sa donje strane;
Slika 1.4. predstavlja prikaz tela boce u pogledu sa gornje strane.

Boca, kao što se može videti sa priloženih slika, oblikovana je tako da je karakterišu tri segmenta i to: donji, cilindrični deo tela, središnji konusni deo tela i gornji sferni deo tela iznad koga se nalazi vrat sa zatvaračem.

Telo boce, približno, u donje četiri devetine, je oblikovano cilindrično s tim što, približno gornje dve devetine ovog dela tela karakteriše to što je telo boce nešto uže, manjeg je prečnika i nalazi se iznad dela koji je oblikovan u vidu veoma niskog zarubljenog konusa. Iznad napred navedenog užeg, cilindričnog dela tela boce, za etiketu, nalazi se deo tela boce oblikovan u vidu veoma niskog, obrnutog, zarubljenog konusa.

Iznad ovog niskog dela tela boce, oblika obrnutog zarubljenog konusa, u nastavku telo boce se sužava i oblikovano je u vidu zarubljenog konusa, a visina ovog dela tela iznosi, približno, četiri devetine ukupne visine tela boce. Gornju četvrtinu ovog dela tela, po celom obimu, karakterišu tri, međusobno paralelna, žljeba lučnog poprečnog preseka. Telo boce između ovih žljebova karakteriše takođe lučni poprečni presek koji je suprotne orijentacije od preseka žljebova. Iznad ovog dela tela, oblika zarubljenog konusa, telo boce se ponovo širi i oblikovano je u vidu obrnutog zarubljenog konusa a prelaz između ova dva dela tela je lučan. Gornji manji bazis donjeg dela tela oblika zarubljenog konusa i donji bazis gornjeg dela oblika obrnutog zarubljenog konusa su kompatibilni. U nastavku, iznad dela tela oblika obrnutog zarubljenog konusa, telo boce je oblikovano u vidu dela sfernog omotača. Ovaj deo tela, po celom omotaču, osim u gornjem delu, bitno karakterišu, približno, poluloptasta ispupčenja. Iznad sfernog dela tela boce uzdiže se kratak cilindrični vrat boce sa cilindričnim zatvaračem. Vrat boce u gornjem delu, a ispod zatvarača ima jedno prstenasto proširenje. Kružno dno boce je konkavno i karakteriše ga jedno udubljenje u središtu, oblika odsečka lopte. Po obodnoj ivici dna nalazi se pet istovetnih udubljenja oblikovana u vidu omotača četvrtine lopte. Ova udubljenja zahvataju delimično i donji deo cilindričnog dela tela boce.

Oblikovanje napred opisanih delova tela boce sa ispupčenjima i žljebovima na tim delovima tela daju celoj boci nov ukupan izgled.`;

export interface SectionTaskOptions {
  mode: AiDraftMode;
  targetPages: number;
  /** The section to write in this call. */
  section: { key: string; title: string; targetWords: number };
  /** Sections already written in this draft, in call order (text included so the model can build on them). */
  written: { key: string; title: string; content: string }[];
  /** Sections that follow, so the model does not write their content now. */
  remaining: { key: string; title: string }[];
  imageCount: number;
}

/** Marker appended to a section whose call hit `max_tokens`; the text that arrived is kept. */
export const TRUNCATED_MARKER = '[TEKST PREKINUT — pokrenite „Proširi i doteraj" za ovu sekciju]';

/** The closing instruction of one section call: mode, which section, its word target, what is already written. */
export function renderSectionTask(options: SectionTaskOptions): string {
  const totalWords = options.targetPages * WORDS_PER_PAGE;
  const modeText =
    options.mode === 'EXPAND'
      ? 'Režim: PROŠIRI I DOTERAJ. Postojeći tekst sekcije je korisnikov unos: zadrži svaku činjenicu i formulaciju koju je korisnik napisao (smeš da je jezički doteraš), proširi ga podacima iz konteksta i slika i uredi strukturu. Ništa iz korisnikovog teksta ne izostavljaj.'
      : 'Režim: GENERIŠI. Napiši sekciju iz početka na osnovu podataka; postojeći tekst sekcije (ako postoji) koristi kao dodatni izvor činjenica, ne kao obavezan predložak.';
  const written = options.written.length
    ? [
        'Sekcije ovog nacrta koje su već napisane (nadovezuj se, ne ponavljaj, ne protivreči):',
        ...options.written.map((w) => `### ${w.key}: ${w.title}\n${w.content}`),
      ].join('\n\n')
    : 'Ovo je prva sekcija nacrta; nijedna još nije napisana.';
  const remaining = options.remaining.length
    ? `Sekcije koje slede u narednim pozivima (ne piši njihov sadržaj sada): ${options.remaining.map((r) => `${r.key} (${r.title})`).join(', ')}.`
    : 'Ovo je poslednja sekcija nacrta.';
  return [
    '## Zadatak',
    modeText,
    `Ceo dokument cilja oko ${options.targetPages} ${options.targetPages === 1 ? 'stranu' : 'strana'} (≈ ${totalWords.toLocaleString('sr-Latn-RS')} reči), raspoređeno po sekcijama.`,
    options.imageCount > 0
      ? `Priloženo je ${options.imageCount} slika (prikazi, fotografije, renderi) — opiši izgled koji se na njima vidi i poveži ga sa brojevima prikaza iz plana.`
      : 'Nije priložena nijedna slika: opiši samo ono što je u podacima, a za vizuelne detalje koji nisu navedeni ostavi markere [POTREBNA DOPUNA: …].',
    written,
    remaining,
    `SADA NAPIŠI SEKCIJU ${options.section.key}: ${options.section.title}. Ciljni obim ove sekcije: oko ${options.section.targetWords.toLocaleString('sr-Latn-RS')} reči (orijentaciono; dužina se postiže detaljnošću, ne ponavljanjem).`,
    'Vrati JSON po šemi: content (tekst sekcije), placeholders (broj markera), notes[] (napomene za korisnika o ovoj sekciji).',
  ].join('\n');
}
