import { useMemo } from 'react'

import type { SectionContentItem } from '@bluprynt/forms-core'

import { ROOT } from './constants'
import { useFormContext } from './form-context'

export type FormSectionEntry = Omit<SectionContentItem, 'id' | 'type'> & {
    id: typeof ROOT | number
}

export const useFormSections = (
    defaultSectionTitle = 'General',
    defaultSectionDescription?: string,
): FormSectionEntry[] => {
    const { definition, visibilityMap, data } = useFormContext()

    // biome-ignore lint/correctness/useExhaustiveDependencies: invalidate section list when data changes
    return useMemo(() => {
        if (!definition) return []

        const result: FormSectionEntry[] = []

        const rootFields = definition.content.filter((item) => item.type !== 'section')
        if (rootFields.some((item) => visibilityMap.get(item.id)))
            result.push({
                id: ROOT,
                title: defaultSectionTitle,
                description: defaultSectionDescription,
                content: rootFields,
                condition: undefined,
            })

        for (const item of definition.content) {
            if (item.type === 'section') {
                if (visibilityMap.get(item.id) === false) continue

                result.push(item)
            }
        }

        return result
    }, [definition?.content, visibilityMap, data, defaultSectionTitle, defaultSectionDescription])
}
