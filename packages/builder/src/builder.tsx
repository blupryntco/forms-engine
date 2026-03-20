import type { FC, PropsWithChildren } from 'react'

import type { ContentItem, FormDefinition } from '@bluprynt/forms-core'
import { DragDropProvider } from '@dnd-kit/react'

import { AddPlaceholder, type AddPlaceholderRenderProps } from './add-placeholder'
import { isAddPlaceholder, isField, isSection, NewContentItem } from './core/types'
import { Field, type FieldRenderProps } from './field'
import { Section, type SectionRenderProps } from './section'
import { useFormBuilder } from './use-form-builder'

type FormBuilderProps = {
    definition: FormDefinition
    container: FC<PropsWithChildren>
    section: FC<SectionRenderProps>
    field: FC<FieldRenderProps>
    addPlaceholder: FC<AddPlaceholderRenderProps>
    selectedId?: number | null
    onDefinitionChange?: (definition: FormDefinition) => void
}

export const FormBuilder: FC<FormBuilderProps> = ({
    definition,
    container: Container,
    section: SectionComponent,
    field: FieldComponent,
    addPlaceholder: AddPlaceholderComponent,
    selectedId,
    onDefinitionChange,
}) => {
    const {
        items,
        handleItemAdd,
        handleItemChange,
        handleItemRemove,
        handleDragStart,
        handleDragOver,
        handleDragMove,
        handleDragEnd,
    } = useFormBuilder(definition, onDefinitionChange)

    return (
        <DragDropProvider
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}>
            <Container>
                {items.map((item, index) => {
                    const onAdd = (value: NewContentItem) =>
                        handleItemAdd(item.type === 'section' ? item.id : item.parentId, value)
                    const onRemove = () => handleItemRemove(item.id)
                    const onChange = (value: ContentItem) => handleItemChange(value.id, value)

                    return isSection(item) ? (
                        <Section
                            key={item.id}
                            id={item.id}
                            depth={item.depth}
                            index={index}
                            parentId={item.parentId}
                            item={item.item}
                            isSelected={selectedId === item.id}
                            component={SectionComponent}
                            onAdd={onAdd}
                            onRemove={onRemove}
                            onChange={onChange}
                        />
                    ) : isField(item) ? (
                        <Field
                            key={item.id}
                            id={item.id}
                            depth={item.depth}
                            index={index}
                            parentId={item.parentId}
                            type={item.type}
                            item={item.item}
                            isSelected={selectedId === item.id}
                            component={FieldComponent}
                            onAdd={onAdd}
                            onRemove={onRemove}
                            onChange={onChange}
                        />
                    ) : isAddPlaceholder(item) ? (
                        <AddPlaceholder
                            key={item.id}
                            depth={item.depth}
                            parentId={item.parentId}
                            component={AddPlaceholderComponent}
                            onAdd={onAdd}
                            onChange={handleItemChange}
                        />
                    ) : null
                })}
            </Container>
        </DragDropProvider>
    )
}
