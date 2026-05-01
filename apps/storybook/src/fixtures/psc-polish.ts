import {
  Adopted,
  CarrierStatus,
  type Individual,
  type IndividualSemantics,
  type PedigreeGraph,
  Provenance,
  Sex,
  TwinType,
  VitalStatus,
  inferRelationships,
  parsePedigree,
} from '@pedigree/core';
import { threeGen } from './three-gen.js';

function semantics(args: {
  sex: Sex;
  vital?: VitalStatus;
  proband?: boolean;
  twin?: TwinType;
  adopted?: Adopted;
}): IndividualSemantics {
  return {
    sex: args.sex,
    vital: args.vital ?? VitalStatus.Living,
    conditions: [],
    carrier: CarrierStatus.None,
    twin: args.twin ?? TwinType.None,
    proband: args.proband ?? false,
    adopted: args.adopted ?? Adopted.None,
  };
}

function pregnancyNode(id: string, name: string, vital: VitalStatus, childOf: string): Individual {
  return {
    id,
    childOf,
    name,
    provenance: Provenance.Explicit,
    semantics: semantics({ sex: Sex.Unknown, vital }),
  };
}

export function pscPolishGraph(): PedigreeGraph {
  const base = inferRelationships(parsePedigree(threeGen.patient, threeGen.familyHistory));
  const proband = base.individuals.proband;
  const sister = base.individuals.sister;
  const maunt = base.individuals.maunt;
  const puncle = base.individuals.puncle;
  const parentCoupleId = proband?.childOf;
  const parentCouple = parentCoupleId === undefined ? undefined : base.couples[parentCoupleId];

  if (
    proband === undefined ||
    sister === undefined ||
    maunt === undefined ||
    puncle === undefined ||
    parentCoupleId === undefined ||
    parentCouple === undefined
  ) {
    throw new Error('PSC polish fixture requires the complete three-generation fixture.');
  }

  return {
    ...base,
    individuals: {
      ...base.individuals,
      proband: {
        ...proband,
        twinGroupId: 'twin:proband+sister',
        semantics: {
          ...proband.semantics,
          twin: TwinType.Monozygotic,
        },
      },
      sister: {
        ...sister,
        twinGroupId: 'twin:proband+sister',
        semantics: {
          ...sister.semantics,
          twin: TwinType.Monozygotic,
        },
      },
      maunt: {
        ...maunt,
        semantics: {
          ...maunt.semantics,
          adopted: Adopted.AdoptedIn,
        },
      },
      puncle: {
        ...puncle,
        semantics: {
          ...puncle.semantics,
          adopted: Adopted.AdoptedOut,
        },
      },
      miscarriage: pregnancyNode(
        'miscarriage',
        'Miscarriage',
        VitalStatus.Miscarriage,
        parentCoupleId,
      ),
      stillbirth: pregnancyNode('stillbirth', 'Stillbirth', VitalStatus.Stillbirth, parentCoupleId),
      termination: pregnancyNode(
        'termination',
        'Termination',
        VitalStatus.TerminatedPregnancy,
        parentCoupleId,
      ),
    },
    couples: {
      ...base.couples,
      [parentCoupleId]: {
        ...parentCouple,
        consanguineous: true,
      },
    },
  };
}
