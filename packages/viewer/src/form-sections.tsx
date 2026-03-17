import { type ComponentType, type FC, type PropsWithChildren, useMemo } from 'react'

import type { SectionContentItem } from '@bluprynt/forms-core'

import { ROOT } from './constants'
import { useFormContext } from './form-context'

export type FormSectionEntry = Omit<SectionContentItem, 'id' | 'type'> & {
    id: typeof ROOT | number
}

export type FormSectionItemProps = {
    section: FormSectionEntry
    active: boolean
    select: () => void
}

type FormSectionsProps = {
    container: ComponentType<PropsWithChildren>
    item: ComponentType<FormSectionItemProps>
    defaultSectionTitle?: string
    defaultSectionDescription?: string
    onSelect?: (id: typeof ROOT | number) => void
}

export const FormSections: FC<FormSectionsProps> = ({
    container: Container,
    item: Item,
    defaultSectionTitle = 'General',
    defaultSectionDescription,
    onSelect,
}) => {
    const { definition, section, visibilityMap, data, documentErrors } = useFormContext()

    // biome-ignore lint/correctness/useExhaustiveDependencies: invalidate section list when data changes
    const entries = useMemo(() => {
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

    if (!definition || !data || (documentErrors && documentErrors.length > 0)) return null

    return (
        <Container>
            {entries.map((entry) => (
                <Item
                    key={entry.id === ROOT ? 'root' : String(entry.id)}
                    section={entry}
                    active={entry.id === section}
                    select={() => onSelect?.(entry.id)}
                />
            ))}
        </Container>
    )
}
