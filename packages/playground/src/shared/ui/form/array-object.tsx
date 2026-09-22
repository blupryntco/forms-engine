'use client'

import type { FC, ReactNode } from 'react'

import type { ArrayObjEditProps, ArrayObjItemDef, ArrayObjViewProps } from '@bluprynt/forms-viewer'

import { AnswerGuidelines } from './answer-guidelines'
import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'

/** A static sub-field has no label of its own; fall back to its text. */
const headerFor = (subField: ArrayObjItemDef): string =>
    subField.type === 'static' ? (subField.label ?? subField.text) : subField.label

/**
 * `kind: 'table'` shares one header across every row and gives each sub-field
 * its own column. Compact, but it reads well only when the cells are narrow.
 */
const TableHeader: FC<{ itemsDef: ArrayObjItemDef[]; trailing?: boolean }> = ({ itemsDef, trailing }) => (
    <div className="flex gap-3 border-gray-200 border-b pb-1">
        {itemsDef.map((subField) => (
            <div key={subField.id} className="min-w-0 flex-1 font-medium text-gray-500 text-xs uppercase">
                {headerFor(subField)}
            </div>
        ))}
        {trailing && <div className="w-16 shrink-0" />}
    </div>
)

/** One row's cells: side by side for `table`, stacked for `list`. */
const Row: FC<{ cells: ReactNode[]; itemsDef: ArrayObjItemDef[]; table: boolean }> = ({ cells, itemsDef, table }) =>
    table ? (
        <div className="flex gap-3">
            {cells.map((cell, index) => (
                <div key={itemsDef[index]?.id ?? index} className="min-w-0 flex-1">
                    {cell}
                </div>
            ))}
        </div>
    ) : (
        <div>{cells}</div>
    )

export const ArrayObjView: FC<ArrayObjViewProps> = ({ field, value, itemsDef, kind, children, suggestion }) => {
    const table = kind === 'table'

    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
            {value && value.length > 0 ? (
                <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                    {table && <TableHeader itemsDef={itemsDef} />}
                    {children.map((cells, rowIndex) => (
                        <div
                            key={rowIndex}
                            className={table ? undefined : 'rounded border border-gray-200 bg-white p-2'}>
                            {!table && <p className="mb-1 text-gray-400 text-xs uppercase">Row {rowIndex + 1}</p>}
                            <Row cells={cells} itemsDef={itemsDef} table={table} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400 text-sm italic">
                    No rows
                </div>
            )}
            <AnswerGuidelines text={field.answer_guidelines} />
            <Suggestion suggestion={suggestion} />
        </div>
    )
}

export const ArrayObjEdit: FC<ArrayObjEditProps> = ({
    field,
    value,
    itemsDef,
    kind,
    children,
    errors,
    onAddItem,
    onRemoveItem,
    onMoveItem,
    suggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
}) => {
    const hasError = errors.length > 0
    const table = kind === 'table'
    const rows = value ?? []

    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
            <div className={`rounded-md border p-3 ${hasError ? 'border-red-400' : 'border-gray-300'}`}>
                {rows.length > 0 ? (
                    <div className="space-y-2">
                        {table && <TableHeader itemsDef={itemsDef} trailing />}
                        {children.map((cells, rowIndex) => (
                            <div
                                key={rowIndex}
                                className={`flex items-start gap-3 ${table ? '' : 'rounded border border-gray-200 p-2'}`}>
                                <div className="min-w-0 flex-1">
                                    {!table && (
                                        <p className="mb-1 text-gray-400 text-xs uppercase">Row {rowIndex + 1}</p>
                                    )}
                                    <Row cells={cells} itemsDef={itemsDef} table={table} />
                                </div>
                                <div className="flex w-16 shrink-0 gap-1">
                                    <button
                                        type="button"
                                        disabled={rowIndex === 0}
                                        onClick={() => onMoveItem(rowIndex, rowIndex - 1)}
                                        className="mt-1 rounded px-1 py-1 text-gray-500 text-xs hover:bg-gray-100 disabled:opacity-30">
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveItem(rowIndex)}
                                        className="mt-1 rounded px-1 py-1 text-red-600 text-xs hover:bg-red-50">
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm italic">No rows</p>
                )}
                <button
                    type="button"
                    onClick={onAddItem}
                    className="mt-3 rounded-md bg-blue-50 px-3 py-1.5 font-medium text-blue-700 text-xs hover:bg-blue-100">
                    + Add row
                </button>
            </div>
            <AnswerGuidelines text={field.answer_guidelines} />
            <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
        </div>
    )
}
