import type { FormDefinition, FormDocument } from '@bluprynt/forms-core'
import { atom } from 'jotai'

import { SAMPLE_FORMS } from '@/shared/data'

const initial = SAMPLE_FORMS[0]

export const formDefinitionAtom = atom<FormDefinition | undefined>(initial?.definition)

export const formDocumentAtom = atom<FormDocument | undefined>(initial?.values)
