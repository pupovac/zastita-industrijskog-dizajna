import { findPatentTerms } from './patent-terms';

describe('findPatentTerms', () => {
  const terms = (text: string) => findPatentTerms(text).map((m) => m.term);

  it('finds every listed term in its inflected forms', () => {
    expect(terms('Predmet pronalaska je panel.')).toEqual(['pronalazak']);
    expect(terms('Pronalazak se odnosi na panel; pronalazač je poznat.')).toEqual(['pronalazak', 'pronalazak']);
    expect(terms('Prema patentnom zahtevu 1')).toEqual(['patentni zahtev']);
    expect(terms('Rešava se tehnički problem spajanja.')).toEqual(['tehnički problem']);
    expect(terms('Postiže se tehnički efekat, bez tehničkog efekta.')).toEqual(['tehnički efekat', 'tehnički efekat']);
    expect(terms('Inventivni nivo je visok.')).toEqual(['inventivni nivo']);
  });

  it('reports a phrase once, not also its parts', () => {
    expect(terms('Opis realizacije pronalaska sledi.')).toEqual(['realizacija pronalaska']);
  });

  it('finds the wrong name of the procedure', () => {
    const wrongName = ['Patentiranje', 'industrijskog', 'dizajna'].join(' ');
    expect(terms(`${wrongName} panela`)).toEqual([['patentiranje', 'industrijskog', 'dizajna'].join(' ')]);
  });

  it('does not flag ordinary design language or the verb "pronalazi"', () => {
    const text =
      'Panel je pravougaonog oblika sa stepenastim profilom na dužim ivicama. Korisnik pronalazi panel u katalogu. ' +
      'Prijava za priznanje prava na industrijski dizajn.';
    expect(findPatentTerms(text)).toEqual([]);
  });

  it('returns positions in text order', () => {
    const found = findPatentTerms('Inventivni nivo i pronalazak.');
    expect(found.map((m) => m.index)).toEqual([0, 18]);
    expect(found[1].match).toBe('pronalazak');
  });
});
