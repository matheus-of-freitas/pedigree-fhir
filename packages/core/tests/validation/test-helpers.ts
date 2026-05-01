import type {
  Couple,
  CoupleId,
  Individual,
  IndividualId,
  PedigreeGraph,
  Provenance as ProvenanceType,
} from '../../src/model/types.js';
import { Provenance } from '../../src/model/types.js';
import {
  Adopted,
  CarrierStatus,
  type IndividualSemantics,
  Sex,
  TwinType,
  VitalStatus,
} from '../../src/psc/semantics.js';

export function semantics(sex: Sex = Sex.Unknown, proband = false): IndividualSemantics {
  return {
    sex,
    vital: VitalStatus.Living,
    conditions: [],
    carrier: CarrierStatus.None,
    twin: TwinType.None,
    proband,
    adopted: Adopted.None,
  };
}

export function individual(
  id: IndividualId,
  opts: {
    childOf?: CoupleId;
    sex?: Sex;
    provenance?: ProvenanceType;
    relationshipToProband?: string;
    proband?: boolean;
  } = {},
): Individual {
  return {
    id,
    semantics: semantics(opts.sex, opts.proband ?? false),
    provenance: opts.provenance ?? Provenance.Explicit,
    ...(opts.childOf === undefined ? {} : { childOf: opts.childOf }),
    ...(opts.relationshipToProband === undefined
      ? {}
      : { relationshipToProband: opts.relationshipToProband }),
  };
}

export function couple(id: CoupleId, partners: [IndividualId, IndividualId]): Couple {
  return { id, partners, consanguineous: false, provenance: Provenance.Explicit };
}

export function graph(args: {
  proband: Individual;
  relatives?: readonly Individual[];
  couples?: readonly Couple[];
}): PedigreeGraph {
  const individuals = [args.proband, ...(args.relatives ?? [])];
  return {
    proband: args.proband.id,
    individuals: Object.fromEntries(individuals.map((ind) => [ind.id, ind])),
    couples: Object.fromEntries((args.couples ?? []).map((c) => [c.id, c])),
  };
}
