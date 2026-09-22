/**
 * Frozen corpus of form definitions and documents authored against
 * `@bluprynt/forms-core@4.0.1` (the last released version, identical to `main`).
 *
 * The nine `*.definition.json` / `*.document.json` pairs were extracted verbatim
 * from the playground's sample forms on `main`. `matrix.*` is hand-authored and
 * covers the whole 4.0.1 surface: every field type, every validation rule, every
 * condition operator, compound conditions, 3-level nesting, and -- the part that
 * matters most -- conditions that reference `array`- and `file`-valued fields.
 *
 * These files are **frozen**. A failing assertion means the engine changed, not
 * that a fixture needs updating. Fix the source or record the change as an
 * intended break; never edit a fixture to make a test pass.
 */

import type { FormDefinition } from '../../types/form-definition'
import type { FormDocument } from '../../types/form-values'
import complianceDisclosureDefinition from './compliance-disclosure.definition.json'
import complianceDisclosureDocument from './compliance-disclosure.document.json'
import complianceProgramAssessmentDefinition from './compliance-program-assessment.definition.json'
import complianceProgramAssessmentDocument from './compliance-program-assessment.document.json'
import custodyAssessmentDefinition from './custody-assessment.definition.json'
import custodyAssessmentDocument from './custody-assessment.document.json'
import matrixDefinition from './matrix.definition.json'
import matrixInvalidDocument from './matrix.invalid.document.json'
import matrixShiftedDocument from './matrix.shifted.document.json'
import matrixValidDocument from './matrix.valid.document.json'
import portfolioDeclarationDefinition from './portfolio-declaration.definition.json'
import portfolioDeclarationDocument from './portfolio-declaration.document.json'
import regulatoryComplianceDefinition from './regulatory-compliance.definition.json'
import regulatoryComplianceDocument from './regulatory-compliance.document.json'
import suspiciousActivityReportDefinition from './suspicious-activity-report.definition.json'
import suspiciousActivityReportDocument from './suspicious-activity-report.document.json'
import tokenListingApplicationDefinition from './token-listing-application.definition.json'
import tokenListingApplicationDocument from './token-listing-application.document.json'
import travelRuleReportDefinition from './travel-rule-report.definition.json'
import travelRuleReportDocument from './travel-rule-report.document.json'
import vaspRegistrationDefinition from './vasp-registration.definition.json'
import vaspRegistrationDocument from './vasp-registration.document.json'

/**
 * Widening cast applied at the fixture boundary.
 *
 * Fixtures are deliberately **not** typed against the current source types: if
 * they were, a type change would force a fixture edit and the corpus would stop
 * being a record of what 4.0.1 accepted.
 */
const asDefinition = (value: unknown): FormDefinition => value as FormDefinition
const asDocument = (value: unknown): FormDocument => value as FormDocument

type LegacyFixture = {
    slug: string
    definition: FormDefinition
    document: FormDocument
}

/** The nine real sample forms, extracted from `main`'s playground. */
export const LEGACY_SAMPLES: LegacyFixture[] = [
    {
        slug: 'compliance-disclosure',
        definition: asDefinition(complianceDisclosureDefinition),
        document: asDocument(complianceDisclosureDocument),
    },
    {
        slug: 'compliance-program-assessment',
        definition: asDefinition(complianceProgramAssessmentDefinition),
        document: asDocument(complianceProgramAssessmentDocument),
    },
    {
        slug: 'custody-assessment',
        definition: asDefinition(custodyAssessmentDefinition),
        document: asDocument(custodyAssessmentDocument),
    },
    {
        slug: 'portfolio-declaration',
        definition: asDefinition(portfolioDeclarationDefinition),
        document: asDocument(portfolioDeclarationDocument),
    },
    {
        slug: 'regulatory-compliance',
        definition: asDefinition(regulatoryComplianceDefinition),
        document: asDocument(regulatoryComplianceDocument),
    },
    {
        slug: 'suspicious-activity-report',
        definition: asDefinition(suspiciousActivityReportDefinition),
        document: asDocument(suspiciousActivityReportDocument),
    },
    {
        slug: 'token-listing-application',
        definition: asDefinition(tokenListingApplicationDefinition),
        document: asDocument(tokenListingApplicationDocument),
    },
    {
        slug: 'travel-rule-report',
        definition: asDefinition(travelRuleReportDefinition),
        document: asDocument(travelRuleReportDocument),
    },
    {
        slug: 'vasp-registration',
        definition: asDefinition(vaspRegistrationDefinition),
        document: asDocument(vaspRegistrationDocument),
    },
]

/** The hand-authored coverage matrix. */
export const MATRIX = {
    definition: asDefinition(matrixDefinition),
    /** Every visible field satisfied; validates clean. */
    valid: asDocument(matrixValidDocument),
    /** Trips all 13 legacy `FieldValidationRule` codes. */
    invalid: asDocument(matrixInvalidDocument),
    /** Byte-identical to `valid` except `form.submittedAt`; isolates relative-date resolution. */
    shifted: asDocument(matrixShiftedDocument),
}

/** The whole corpus: nine real forms plus the matrix. */
export const LEGACY_CORPUS: LegacyFixture[] = [
    ...LEGACY_SAMPLES,
    { slug: 'matrix', definition: MATRIX.definition, document: MATRIX.valid },
]

/** Raw, uncast definitions -- for feeding the JSON schema validator as wire data. */
export const LEGACY_RAW_DEFINITIONS: Record<string, unknown> = {
    'compliance-disclosure': complianceDisclosureDefinition,
    'compliance-program-assessment': complianceProgramAssessmentDefinition,
    'custody-assessment': custodyAssessmentDefinition,
    'portfolio-declaration': portfolioDeclarationDefinition,
    'regulatory-compliance': regulatoryComplianceDefinition,
    'suspicious-activity-report': suspiciousActivityReportDefinition,
    'token-listing-application': tokenListingApplicationDefinition,
    'travel-rule-report': travelRuleReportDefinition,
    'vasp-registration': vaspRegistrationDefinition,
    matrix: matrixDefinition,
}
