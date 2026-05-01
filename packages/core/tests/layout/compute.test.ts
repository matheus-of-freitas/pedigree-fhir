import { describe, expect, it } from 'vitest';
import { parsePedigree } from '../../src/fhir/parse.js';
import { computePedigreeLayout } from '../../src/layout/compute.js';
import { inferRelationships } from '../../src/model/infer.js';
import { type PedigreeGraph, Provenance } from '../../src/model/types.js';
import { Adopted, CarrierStatus, Sex, TwinType, VitalStatus } from '../../src/psc/semantics.js';
import { fmh, patient } from '../fixtures/builders.js';

const Y0 = 240;
const Y1 = 120;
const Y2 = 0;

function nodeAt(layout: ReturnType<typeof computePedigreeLayout>, id: string) {
  return layout.nodes.find((n) => n.id === id);
}

describe('computePedigreeLayout — degenerate', () => {
  it('returns an empty layout when the proband cannot be resolved', () => {
    const malformed: PedigreeGraph = { proband: 'ghost', individuals: {}, couples: {} };
    const out = computePedigreeLayout(malformed);
    expect(out.nodes).toEqual([]);
    expect(out.partnerEdges).toEqual([]);
    expect(out.parentDrops).toEqual([]);
    expect(out.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    });
  });

  it('places a proband-only graph at the origin', () => {
    const g = parsePedigree(patient({ id: 'p', gender: 'female' }), []);
    const out = computePedigreeLayout(g);
    expect(out.nodes).toHaveLength(1);
    expect(nodeAt(out, 'p')).toEqual({ id: 'p', x: 0, y: Y0 });
    expect(out.partnerEdges).toEqual([]);
    expect(out.parentDrops).toEqual([]);
  });
});

describe('computePedigreeLayout — proband + parents (no aunts/uncles or grandparents)', () => {
  it('centers the parent couple over the proband at gen -1', () => {
    const g = inferRelationships(
      parsePedigree(patient({ id: 'p', gender: 'female' }), [
        fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
        fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
      ]),
    );
    const out = computePedigreeLayout(g);
    expect(nodeAt(out, 'p')).toEqual({ id: 'p', x: 0, y: Y0 });
    expect(nodeAt(out, 'm')).toEqual({ id: 'm', x: -30, y: Y1 }); // couplePitch/2 = 30
    expect(nodeAt(out, 'f')).toEqual({ id: 'f', x: 30, y: Y1 });

    expect(out.partnerEdges).toHaveLength(1);
    const edge = out.partnerEdges[0];
    expect(edge?.consanguineous).toBe(false);
    expect(edge?.path).toBe('M -30 120 H 30');
    expect(edge?.midpoint).toEqual({ x: 0, y: Y1 });

    expect(out.parentDrops).toHaveLength(1);
    expect(out.parentDrops[0]?.children).toEqual(['p']);
    expect(out.parentDrops[0]?.twinJunctions).toEqual([]);
  });

  it('places multiple siblings centered around 0 with proband included', () => {
    const g = inferRelationships(
      parsePedigree(patient({ id: 'p' }), [fmh({ id: 's', patientId: 'p', relationship: 'NSIS' })]),
    );
    const out = computePedigreeLayout(g);
    // proband enters first → leftmost; sibling next.
    expect(nodeAt(out, 'p')).toEqual({ id: 'p', x: -40, y: Y0 });
    expect(nodeAt(out, 's')).toEqual({ id: 's', x: 40, y: Y0 });
    // Parent couple is centered over the (proband, sibling) midpoint, i.e. 0.
    expect(nodeAt(out, 'inferred:mother-of:p')?.x).toBe(-30);
    expect(nodeAt(out, 'inferred:father-of:p')?.x).toBe(30);
  });

  it('keeps larger sibling rows complete and centered', () => {
    const g = inferRelationships(
      parsePedigree(patient({ id: 'p' }), [
        fmh({ id: 's1', patientId: 'p', relationship: 'NSIS' }),
        fmh({ id: 's2', patientId: 'p', relationship: 'NBRO' }),
        fmh({ id: 's3', patientId: 'p', relationship: 'NSIS' }),
        fmh({ id: 's4', patientId: 'p', relationship: 'NBRO' }),
        fmh({ id: 's5', patientId: 'p', relationship: 'NSIS' }),
        fmh({ id: 's6', patientId: 'p', relationship: 'NBRO' }),
      ]),
    );
    const out = computePedigreeLayout(g);
    const siblingRow = out.nodes.filter((n) => n.y === Y0).map((n) => n.id);
    const xs = out.nodes.filter((n) => n.y === Y0).map((n) => n.x);

    expect(siblingRow).toEqual(['p', 's1', 's2', 's3', 's4', 's5', 's6']);
    expect(xs).toEqual([-240, -160, -80, 0, 80, 160, 240]);
    expect(nodeAt(out, 'inferred:mother-of:p')?.x).toBe(-30);
    expect(nodeAt(out, 'inferred:father-of:p')?.x).toBe(30);
  });
});

describe('computePedigreeLayout — full 3-generation', () => {
  function build3Gen(): PedigreeGraph {
    return inferRelationships(
      parsePedigree(patient({ id: 'p', gender: 'female' }), [
        fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
        fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
        fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
        fmh({ id: 'mgf', patientId: 'p', relationship: 'MGRFTH', sex: 'male' }),
        fmh({ id: 'pgm', patientId: 'p', relationship: 'PGRMTH', sex: 'female' }),
        fmh({ id: 'pgf', patientId: 'p', relationship: 'PGRFTH', sex: 'male' }),
        fmh({ id: 'maunt', patientId: 'p', relationship: 'MAUNT', sex: 'female' }),
        fmh({ id: 'puncle', patientId: 'p', relationship: 'PUNCLE', sex: 'male' }),
      ]),
    );
  }

  it('places gen -1 with mother on the right of maternal sibship and father on the left of paternal', () => {
    const out = computePedigreeLayout(build3Gen());
    const mother = nodeAt(out, 'm');
    const father = nodeAt(out, 'f');
    const maunt = nodeAt(out, 'maunt');
    const puncle = nodeAt(out, 'puncle');

    expect(mother).toBeDefined();
    expect(father).toBeDefined();
    expect(mother?.y).toBe(Y1);
    expect(father?.y).toBe(Y1);

    // Mother is on the right side of the maternal sibship → maunt is to her left.
    expect(maunt?.x).toBeLessThan(mother?.x as number);
    // Father is on the left side of the paternal sibship → puncle is to his right.
    expect(puncle?.x).toBeGreaterThan(father?.x as number);

    // Parent couple sits centered over the proband's sibship (just proband alone here).
    expect((mother?.x as number) + (father?.x as number)).toBeCloseTo(0);
  });

  it('places grandparent couples centered over their respective sibships', () => {
    const out = computePedigreeLayout(build3Gen());
    const mgm = nodeAt(out, 'mgm');
    const mgf = nodeAt(out, 'mgf');
    const pgm = nodeAt(out, 'pgm');
    const pgf = nodeAt(out, 'pgf');
    const mother = nodeAt(out, 'm');
    const maunt = nodeAt(out, 'maunt');
    const father = nodeAt(out, 'f');
    const puncle = nodeAt(out, 'puncle');

    // Maternal grandparent midpoint = average of maternal sibship midpoints
    const maternalCenter = ((mother?.x as number) + (maunt?.x as number)) / 2;
    expect(((mgm?.x as number) + (mgf?.x as number)) / 2).toBeCloseTo(maternalCenter);
    expect(mgm?.y).toBe(Y2);

    const paternalCenter = ((father?.x as number) + (puncle?.x as number)) / 2;
    expect(((pgm?.x as number) + (pgf?.x as number)) / 2).toBeCloseTo(paternalCenter);
    expect(pgf?.y).toBe(Y2);
  });

  it('emits one partner edge per couple (3: parent + 2 grandparents)', () => {
    const out = computePedigreeLayout(build3Gen());
    expect(out.partnerEdges).toHaveLength(3);
    expect(out.parentDrops).toHaveLength(3);
  });

  it('parent-drop path is a multi-segment SVG path', () => {
    const out = computePedigreeLayout(build3Gen());
    const probandDrop = out.parentDrops.find((d) => d.children.includes('p'));
    expect(probandDrop).toBeDefined();
    expect(probandDrop?.path).toMatch(/^M /);
    // Multi-segment paths use multiple `M`s.
    const moveCount = (probandDrop?.path.match(/\bM /g) ?? []).length;
    expect(moveCount).toBeGreaterThanOrEqual(2);
  });
});

describe('computePedigreeLayout — hideAuntsUncles', () => {
  function build3Gen(): PedigreeGraph {
    return inferRelationships(
      parsePedigree(patient({ id: 'p', gender: 'female' }), [
        fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
        fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
        fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
        fmh({ id: 'mgf', patientId: 'p', relationship: 'MGRFTH', sex: 'male' }),
        fmh({ id: 'pgm', patientId: 'p', relationship: 'PGRMTH', sex: 'female' }),
        fmh({ id: 'pgf', patientId: 'p', relationship: 'PGRFTH', sex: 'male' }),
        fmh({ id: 'maunt', patientId: 'p', relationship: 'MAUNT', sex: 'female' }),
        fmh({ id: 'muncle', patientId: 'p', relationship: 'MUNCLE', sex: 'male' }),
        fmh({ id: 'paunt', patientId: 'p', relationship: 'PAUNT', sex: 'female' }),
        fmh({ id: 'puncle', patientId: 'p', relationship: 'PUNCLE', sex: 'male' }),
      ]),
    );
  }

  it('renders all aunts/uncles when hideAuntsUncles is undefined', () => {
    const out = computePedigreeLayout(build3Gen());
    const ids = out.nodes.map((n) => n.id);
    expect(ids).toContain('maunt');
    expect(ids).toContain('muncle');
    expect(ids).toContain('paunt');
    expect(ids).toContain('puncle');
  });

  it('renders all aunts/uncles when both sides are false', () => {
    const out = computePedigreeLayout(build3Gen(), {
      hideAuntsUncles: { maternal: false, paternal: false },
    });
    const ids = out.nodes.map((n) => n.id);
    expect(ids).toContain('maunt');
    expect(ids).toContain('puncle');
  });

  it('hides maternal aunts/uncles only', () => {
    const out = computePedigreeLayout(build3Gen(), {
      hideAuntsUncles: { maternal: true, paternal: false },
    });
    const ids = out.nodes.map((n) => n.id);
    expect(ids).not.toContain('maunt');
    expect(ids).not.toContain('muncle');
    expect(ids).toContain('paunt');
    expect(ids).toContain('puncle');
  });

  it('hides paternal aunts/uncles only', () => {
    const out = computePedigreeLayout(build3Gen(), {
      hideAuntsUncles: { maternal: false, paternal: true },
    });
    const ids = out.nodes.map((n) => n.id);
    expect(ids).toContain('maunt');
    expect(ids).not.toContain('paunt');
    expect(ids).not.toContain('puncle');
  });

  it('hides both sides', () => {
    const out = computePedigreeLayout(build3Gen(), {
      hideAuntsUncles: { maternal: true, paternal: true },
    });
    const ids = out.nodes.map((n) => n.id);
    expect(ids).not.toContain('maunt');
    expect(ids).not.toContain('muncle');
    expect(ids).not.toContain('paunt');
    expect(ids).not.toContain('puncle');
    // Direct parents and grandparents still rendered.
    expect(ids).toContain('m');
    expect(ids).toContain('mgm');
  });
});

describe('computePedigreeLayout — partial generations', () => {
  it('lays out only the maternal grandparents when there is no paternal evidence', () => {
    const g = inferRelationships(
      parsePedigree(patient({ id: 'p' }), [
        fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
      ]),
    );
    const out = computePedigreeLayout(g);
    // Maternal GP couple is laid out; paternal side has no GP couple.
    const grandparentEdges = out.partnerEdges.filter((e) => e.midpoint.y === Y2);
    expect(grandparentEdges).toHaveLength(1);
  });
});

describe('computePedigreeLayout — PSC polish', () => {
  function buildSibship(): PedigreeGraph {
    return inferRelationships(
      parsePedigree(patient({ id: 'p', gender: 'female' }), [
        fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
        fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
        fmh({ id: 's', patientId: 'p', relationship: 'NSIS', sex: 'female' }),
      ]),
    );
  }

  it('emits a double partner path for consanguineous couples', () => {
    const g = buildSibship();
    const coupleId = g.individuals.p?.childOf as string;
    const out = computePedigreeLayout({
      ...g,
      couples: {
        ...g.couples,
        [coupleId]: { ...g.couples[coupleId]!, consanguineous: true },
      },
    });

    const edge = out.partnerEdges.find((e) => e.coupleId === coupleId);
    expect(edge?.consanguineous).toBe(true);
    expect(edge?.path).toBe('M -30 116.8 H 30 M -30 123.2 H 30');
  });

  it('emits monozygotic twin diagonals plus a zygosity connector', () => {
    const g = buildSibship();
    const individuals = {
      ...g.individuals,
      p: {
        ...g.individuals.p!,
        twinGroupId: 'twin:p+s',
        semantics: { ...g.individuals.p!.semantics, twin: TwinType.Monozygotic },
      },
      s: {
        ...g.individuals.s!,
        twinGroupId: 'twin:p+s',
        semantics: { ...g.individuals.s!.semantics, twin: TwinType.Monozygotic },
      },
    };
    const out = computePedigreeLayout({ ...g, individuals });
    const drop = out.parentDrops.find((d) => d.children.includes('p'));
    const junction = drop?.twinJunctions[0];

    expect(junction).toMatchObject({
      twinGroupId: 'twin:p+s',
      type: TwinType.Monozygotic,
      children: ['p', 's'],
      junction: { x: 0, y: 180 },
    });
    expect(junction?.path).toBe('M 0 180 L -40 220 M 0 180 L 40 220');
    expect(junction?.monozygoticPath).toBe('M -20 200 H 20');
    expect(drop?.path).toContain(junction?.monozygoticPath);
  });

  it('emits dizygotic twin diagonals without a monozygotic connector', () => {
    const g = buildSibship();
    const individuals = {
      ...g.individuals,
      p: {
        ...g.individuals.p!,
        twinGroupId: 'twin:dz',
        semantics: { ...g.individuals.p!.semantics, twin: TwinType.Dizygotic },
      },
      s: {
        ...g.individuals.s!,
        twinGroupId: 'twin:dz',
        semantics: { ...g.individuals.s!.semantics, twin: TwinType.Dizygotic },
      },
    };
    const out = computePedigreeLayout({ ...g, individuals });
    const junction = out.parentDrops.find((d) => d.children.includes('p'))?.twinJunctions[0];

    expect(junction?.type).toBe(TwinType.Dizygotic);
    expect(junction?.monozygoticPath).toBeUndefined();
  });

  it('falls back to regular child drops for incomplete or stale twin metadata', () => {
    const g = buildSibship();
    const individuals = {
      ...g.individuals,
      p: {
        ...g.individuals.p!,
        twinGroupId: 'twin:single',
        semantics: { ...g.individuals.p!.semantics, twin: TwinType.Dizygotic },
      },
      s: {
        ...g.individuals.s!,
        twinGroupId: 'twin:stale',
        semantics: { ...g.individuals.s!.semantics, twin: TwinType.None },
      },
    };
    const out = computePedigreeLayout({ ...g, individuals });
    const drop = out.parentDrops.find((d) => d.children.includes('p'));

    expect(drop?.twinJunctions).toEqual([]);
    expect(drop?.path).toContain('M -40 180 V 220');
    expect(drop?.path).toContain('M 40 180 V 220');
  });
});

describe('computePedigreeLayout — orderPartnersBySex defaults', () => {
  it('falls back to stored partner order when neither partner has a typed sex', () => {
    // Build a graph by hand where the parent couple has Unknown-sex partners.
    const sem = (sex: Sex) => ({
      sex,
      vital: VitalStatus.Living,
      conditions: [],
      carrier: CarrierStatus.None,
      twin: TwinType.None,
      proband: false,
      adopted: Adopted.None,
    });
    const graph: PedigreeGraph = {
      proband: 'p',
      individuals: {
        p: {
          id: 'p',
          semantics: { ...sem(Sex.Unknown), proband: true },
          provenance: Provenance.Explicit,
          childOf: 'couple:a+b',
        },
        a: { id: 'a', semantics: sem(Sex.Unknown), provenance: Provenance.Inferred },
        b: { id: 'b', semantics: sem(Sex.Unknown), provenance: Provenance.Inferred },
      },
      couples: {
        'couple:a+b': {
          id: 'couple:a+b',
          partners: ['a', 'b'],
          consanguineous: false,
          provenance: Provenance.Inferred,
        },
      },
    };
    const out = computePedigreeLayout(graph);
    const a = nodeAt(out, 'a');
    const b = nodeAt(out, 'b');
    // Default ordering keeps a on the left (mother slot), b on the right (father slot).
    expect((a?.x as number) < (b?.x as number)).toBe(true);
  });

  it('places female partner on the mother slot when both partners have explicit sex', () => {
    const sem = (sex: Sex, isProband = false) => ({
      sex,
      vital: VitalStatus.Living,
      conditions: [],
      carrier: CarrierStatus.None,
      twin: TwinType.None,
      proband: isProband,
      adopted: Adopted.None,
    });
    // Construct a couple where stored partners are [male, female]; expect
    // orderPartnersBySex to flip them so female is on the left.
    const graph: PedigreeGraph = {
      proband: 'p',
      individuals: {
        p: {
          id: 'p',
          semantics: sem(Sex.Female, true),
          provenance: Provenance.Explicit,
          childOf: 'couple:fa+ma',
        },
        fa: { id: 'fa', semantics: sem(Sex.Male), provenance: Provenance.Explicit },
        ma: { id: 'ma', semantics: sem(Sex.Female), provenance: Provenance.Explicit },
      },
      couples: {
        'couple:fa+ma': {
          id: 'couple:fa+ma',
          partners: ['fa', 'ma'],
          consanguineous: false,
          provenance: Provenance.Explicit,
        },
      },
    };
    const out = computePedigreeLayout(graph);
    const father = nodeAt(out, 'fa');
    const mother = nodeAt(out, 'ma');
    expect((mother?.x as number) < (father?.x as number)).toBe(true);
  });
});

describe('computePedigreeLayout — bounds', () => {
  it('inflates the bounding box by half the node size on each side', () => {
    const g = parsePedigree(patient({ id: 'p' }), []);
    const out = computePedigreeLayout(g);
    // Single proband at (0, 240), nodeSize=40 → bounds extend by 20.
    expect(out.bounds).toEqual({
      minX: -20,
      minY: 220,
      maxX: 20,
      maxY: 260,
      width: 40,
      height: 40,
    });
  });

  it('respects custom layout options', () => {
    const g = inferRelationships(
      parsePedigree(patient({ id: 'p' }), [
        fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
        fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
      ]),
    );
    const out = computePedigreeLayout(g, { generationGap: 200, couplePitch: 100 });
    expect(nodeAt(out, 'p')?.y).toBe(400);
    expect(nodeAt(out, 'm')?.y).toBe(200);
    expect(nodeAt(out, 'm')?.x).toBe(-50);
    expect(nodeAt(out, 'f')?.x).toBe(50);
  });
});

describe('computePedigreeLayout — defensive proband-not-in-sibship', () => {
  it('still includes the proband when their childOf points to a couple with no children', () => {
    // Hand-build: proband has childOf=couple, but findChildrenOfCouple returns
    // [] because nobody (not even the proband) is registered as that couple's
    // child. This shouldn't happen via parse + infer, but guards against
    // hand-built graphs.
    const sem = (sex: Sex, isProband = false) => ({
      sex,
      vital: VitalStatus.Living,
      conditions: [],
      carrier: CarrierStatus.None,
      twin: TwinType.None,
      proband: isProband,
      adopted: Adopted.None,
    });
    const graph: PedigreeGraph = {
      proband: 'p',
      individuals: {
        p: {
          id: 'p',
          semantics: sem(Sex.Female, true),
          provenance: Provenance.Explicit,
          childOf: 'couple:m+f',
        },
        m: { id: 'm', semantics: sem(Sex.Female), provenance: Provenance.Inferred },
        f: { id: 'f', semantics: sem(Sex.Male), provenance: Provenance.Inferred },
      },
      couples: {
        'couple:m+f': {
          id: 'couple:m+f',
          partners: ['m', 'f'],
          consanguineous: false,
          provenance: Provenance.Inferred,
        },
      },
    };
    const out = computePedigreeLayout(graph);
    expect(nodeAt(out, 'p')).toBeDefined();
    expect(out.parentDrops[0]?.children).toContain('p');
  });
});
