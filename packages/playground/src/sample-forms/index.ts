export { COMPLIANCE_DISCLOSURE } from './compliance-disclosure'
export { COMPLIANCE_PROGRAM_ASSESSMENT } from './compliance-program-assessment'
export { CUSTODY_ASSESSMENT } from './custody-assessment'
export { REGULATORY_COMPLIANCE } from './regulatory-compliance'
export { SUSPICIOUS_ACTIVITY_REPORT } from './suspicious-activity-report'
export { TOKEN_LISTING_APPLICATION } from './token-listing-application'
export { TRAVEL_RULE_REPORT } from './travel-rule-report'
export type { SampleForm } from './types'
export { VASP_REGISTRATION } from './vasp-registration'

import { COMPLIANCE_DISCLOSURE } from './compliance-disclosure'
import { COMPLIANCE_PROGRAM_ASSESSMENT } from './compliance-program-assessment'
import { CUSTODY_ASSESSMENT } from './custody-assessment'
import { REGULATORY_COMPLIANCE } from './regulatory-compliance'
import { SUSPICIOUS_ACTIVITY_REPORT } from './suspicious-activity-report'
import { TOKEN_LISTING_APPLICATION } from './token-listing-application'
import { TRAVEL_RULE_REPORT } from './travel-rule-report'
import type { SampleForm } from './types'
import { VASP_REGISTRATION } from './vasp-registration'

export const SAMPLE_FORMS: SampleForm[] = [
    TOKEN_LISTING_APPLICATION,
    SUSPICIOUS_ACTIVITY_REPORT,
    VASP_REGISTRATION,
    COMPLIANCE_PROGRAM_ASSESSMENT,
    CUSTODY_ASSESSMENT,
    COMPLIANCE_DISCLOSURE,
    TRAVEL_RULE_REPORT,
    REGULATORY_COMPLIANCE,
]
