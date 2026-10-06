/**
 * Sections of the description drafted in step 10 (§3, Agent 6). D-1 data is kept
 * separately (step 12). Content is written by the drafting agent and the user;
 * the system only stores, versions and checks it.
 */
export const DEFAULT_APPLICATION_SECTIONS = [
  { key: 'TITLE', title: 'Naziv proizvoda (kratak i stvaran)' },
  { key: 'DESCRIPTION', title: 'Opis industrijskog dizajna' },
  { key: 'CHARACTERISTIC_FEATURES', title: 'Karakteristični vizuelni elementi' },
  { key: 'PURPOSE', title: 'Namena (samo u meri u kojoj je primereno)' },
  { key: 'REPRESENTATION_LIST', title: 'Spisak prikaza' },
  { key: 'ATTACHMENT_LIST', title: 'Spisak priloga' },
] as const;

export type ApplicationSectionKey = (typeof DEFAULT_APPLICATION_SECTIONS)[number]['key'];
