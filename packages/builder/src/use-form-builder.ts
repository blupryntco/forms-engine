import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react'

import {
    type ContentItem,
    type FieldContentItem,
    type FormDefinition,
    FormDefinitionEditor,
    type SectionContentItem,
} from '@bluprynt/forms-core'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'

import { INDENTATION, MAX_DEPTH } from './core/constants'
import { getDragDepth, getProjection } from './core/projection'
import { flattenTree, getDescendants } from './core/tree'
import type { NewContentItem, TreeItem } from './core/types'

/**
 * Manages the form builder state: flattened tree items, drag-and-drop reordering,
 * item editing, and removal. Uses {@link FormDefinitionEditor} for all definition mutations
 * and notifies the consumer of structural changes via {@link onDefinitionChange}.
 *
 * @param definition - The current form definition to build upon.
 * @param onDefinitionChange - Optional callback invoked with the updated `FormDefinition`
 *   whenever the tree structure, item content, or item order changes.
 * @returns Flattened items and handlers for item/drag operations.
 */
export const useFormBuilder = (
    definition: FormDefinition,
    onDefinitionChange?: (definition: FormDefinition) => void,
): {
    items: TreeItem[]
    handleItemAdd: (sectionId: number | null, item: NewContentItem) => number
    handleItemChange: (id: number, newItem: ContentItem) => void
    handleItemRemove: (itemId: number) => void
    handleDragStart: ComponentProps<typeof DragDropProvider>['onDragStart']
    handleDragOver: ComponentProps<typeof DragDropProvider>['onDragOver']
    handleDragMove: ComponentProps<typeof DragDropProvider>['onDragMove']
    handleDragEnd: ComponentProps<typeof DragDropProvider>['onDragEnd']
} => {
    const [items, setItems] = useState<TreeItem[]>(() => flattenTree(definition.content))
    const initialDepth = useRef(0)
    const sourceChildren = useRef<TreeItem[]>([])
    const dragSourceId = useRef<number | null>(null)

    const definitionRef = useRef(definition)
    definitionRef.current = definition

    const onDefinitionChangeRef = useRef(onDefinitionChange)
    onDefinitionChangeRef.current = onDefinitionChange

    // Re-sync items when definition changes externally (e.g. from field editor sheet)
    useEffect(() => {
        setItems(flattenTree(definition.content))
    }, [definition])

    const applyEditor = useCallback((editor: FormDefinitionEditor) => {
        const updated = editor.toJSON()
        setItems(flattenTree(updated.content))
        onDefinitionChangeRef.current?.(updated)
    }, [])

    const handleItemAdd = useCallback(
        (sectionId: number | null, item: NewContentItem): number => {
            const editor = new FormDefinitionEditor(definitionRef.current)
            const parentId = sectionId ?? undefined
            const id = editor.nextId()

            if (item.type === 'section') editor.addSection({ ...item, id }, parentId)
            else editor.addField({ ...item, id } as FieldContentItem, parentId)

            applyEditor(editor)
            return id
        },
        [applyEditor],
    )

    const handleItemChange = useCallback(
        (id: number, newItem: ContentItem) => {
            const editor = new FormDefinitionEditor(definitionRef.current)

            if (newItem.type === 'section') {
                const { id: _, type: __, content: ___, ...updates } = newItem as SectionContentItem
                editor.updateSection(id, updates)
            } else {
                const { id: _, type: __, ...updates } = newItem as FieldContentItem
                editor.updateField(id, updates)
            }

            applyEditor(editor)
        },
        [applyEditor],
    )

    const handleItemRemove = useCallback(
        (itemId: number) => {
            const editor = new FormDefinitionEditor(definitionRef.current)
            editor.removeItem(itemId)
            applyEditor(editor)
        },
        [applyEditor],
    )

    const handleDragStart: ComponentProps<typeof DragDropProvider>['onDragStart'] = (event) => {
        const { source } = event.operation
        if (!source) return

        const item = items.find(({ id }) => id === source.id)
        if (!item) return

        initialDepth.current = item.depth
        dragSourceId.current = source.id as number

        setItems((prev) => {
            sourceChildren.current = []
            const descendants = getDescendants(prev, source.id as number)

            return prev.filter((i) => {
                if (descendants.has(i.id)) {
                    sourceChildren.current = [...sourceChildren.current, i]
                    return false
                }
                return true
            })
        })
    }

    const handleDragOver: ComponentProps<typeof DragDropProvider>['onDragOver'] = (event, manager) => {
        const { source, target } = event.operation
        event.preventDefault()

        if (source && target && source.id !== target.id) {
            setItems((prev) => {
                const offsetLeft = manager.dragOperation.transform.x
                const dragDepth = getDragDepth(offsetLeft, INDENTATION)
                const projectedDepth = initialDepth.current + dragDepth

                const { depth, parentId } = getProjection(prev, target.id as number, projectedDepth, MAX_DEPTH)

                const sorted = move(prev, event)
                return sorted.map((item) => (item.id === source.id ? { ...item, depth, parentId } : item))
            })
        }
    }

    const handleDragMove: ComponentProps<typeof DragDropProvider>['onDragMove'] = (event, manager) => {
        if (event.defaultPrevented) return

        const { source, target } = event.operation
        if (!source || !target) return

        const offsetLeft = manager.dragOperation.transform.x
        const dragDepth = getDragDepth(offsetLeft, INDENTATION)
        const projectedDepth = initialDepth.current + dragDepth

        const { depth, parentId } = getProjection(items, source.id as number, projectedDepth, MAX_DEPTH)

        if (
            (source.data as { depth: number })?.depth !== depth ||
            (source.data as { parentId: number | null })?.parentId !== parentId
        ) {
            setItems((prev) => prev.map((item) => (item.id === source.id ? { ...item, depth, parentId } : item)))
        }
    }

    const handleDragEnd: ComponentProps<typeof DragDropProvider>['onDragEnd'] = (event) => {
        if (event.canceled) {
            setItems(flattenTree(definitionRef.current.content))
            dragSourceId.current = null
            sourceChildren.current = []
            return
        }

        const draggedId = dragSourceId.current
        if (draggedId === null) return

        const draggedItem = items.find((i) => i.id === draggedId)
        if (!draggedItem) return

        // Compute sibling index in the new parent
        const targetParentId = draggedItem.parentId
        const draggedFlatIndex = items.findIndex((i) => i.id === draggedId)
        let siblingIndex = 0
        for (let i = 0; i < draggedFlatIndex; i++) {
            const current = items[i]
            if (current && current.parentId === targetParentId && current.type !== 'add-placeholder') {
                siblingIndex++
            }
        }

        const editor = new FormDefinitionEditor(definitionRef.current)
        editor.moveItem(draggedId, targetParentId ?? undefined, siblingIndex)
        applyEditor(editor)

        dragSourceId.current = null
        sourceChildren.current = []
    }

    return {
        items,
        handleItemAdd,
        handleItemChange,
        handleItemRemove,
        handleDragStart,
        handleDragOver,
        handleDragMove,
        handleDragEnd,
    } as const
}
