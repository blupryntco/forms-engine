import { useMemo } from 'react'

import type { FormDefinition } from '@bluprynt/forms-core'
import { FormEngine } from '@bluprynt/forms-core'

export const useFormEngine = (definition: FormDefinition): FormEngine => {
    return useMemo(() => new FormEngine(definition), [definition])
}
