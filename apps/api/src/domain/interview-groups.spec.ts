import { inferInterviewGroup, INTERVIEW_GROUPS } from './interview-groups';

describe('interview groups', () => {
  it('has groups A–G with G as high priority', () => {
    expect(INTERVIEW_GROUPS.map((g) => g.key).join('')).toBe('ABCDEFG');
    expect(INTERVIEW_GROUPS.filter((g) => g.highPriority).map((g) => g.key)).toEqual(['G']);
  });

  it('infers the group from an "A1 — …" prefix', () => {
    expect(inferInterviewGroup('A1 — Ko je podnosilac prijave?')).toBe('A');
    expect(inferInterviewGroup('G12 – Da li je panel objavljen?')).toBe('G');
    expect(inferInterviewGroup('Kako izgleda panel?')).toBeNull();
    expect(inferInterviewGroup('H1 — van opsega')).toBeNull();
  });
});
