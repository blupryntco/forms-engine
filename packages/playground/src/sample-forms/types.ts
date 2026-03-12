import type { FormDefinition, FormValues } from '@bluprynt/forms-core'

export type SampleForm = {
    label: string
    definition: FormDefinition
    values: FormValues
    submittedAt: string
}
