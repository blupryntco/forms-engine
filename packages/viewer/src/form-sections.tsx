import { type ComponentType, type FC, type PropsWithChildren } from 'react'

import { DEFAULT, ROOT } from './constants'
import { useFormContext } from './form-context'
import { type FormSectionEntry, useFormSections } from './use-form-sections'

export type { FormSectionEntry }

export type FormSectionItemProps = {
    index: number
    section: FormSectionEntry
    active: boolean
    select: () => void
}

type FormSectionsProps = {
    container: ComponentType<PropsWithChildren>
    item: ComponentType<FormSectionItemProps>
    defaultSectionTitle?: string
    defaultSectionDescription?: string
    onSelect?: (id: typeof ROOT | typeof DEFAULT | number) => void
}

export const FormSections: FC<FormSectionsProps> = ({
    container: Container,
    item: Item,
    defaultSectionTitle,
    defaultSectionDescription,
    onSelect,
}) => {
    const { definition, data, documentErrors, section } = useFormContext()
    const entries = useFormSections(defaultSectionTitle, defaultSectionDescription)

    if (!definition || !data || (documentErrors && documentErrors.length > 0)) return null

    return (
        <Container>
            {entries.map((entry, index) => (
                <Item
                    key={entry.id === ROOT ? 'root' : String(entry.id)}
                    index={index}
                    section={entry}
                    active={section === DEFAULT ? index === 0 : entry.id === section}
                    select={() => onSelect?.(entry.id)}
                />
            ))}
        </Container>
    )
}
