import { type FC, useCallback, useMemo } from 'react'

import type {
    CompoundCondition,
    Condition,
    ContentItem,
    FieldContentItem,
    FieldType,
    SectionContentItem,
    SelectOption,
    SimpleCondition,
} from '@bluprynt/forms-core'

export type FieldInfo = {
    id: number
    label: string
    type: FieldType
    options?: SelectOption[]
}

export const collectFields = (content: ContentItem[], excludeId?: number): FieldInfo[] => {
    const result: FieldInfo[] = []
    for (const item of content) {
        if (item.type === 'section') {
            result.push(...collectFields((item as SectionContentItem).content, excludeId))
        } else if (item.id !== excludeId) {
            const f = item as FieldContentItem
            result.push({ id: f.id, label: f.label, type: f.type, options: f.options })
        }
    }
    return result
}

const OPERATORS: { value: SimpleCondition['op']; label: string; needsValue: boolean }[] = [
    { value: 'set', label: 'is set', needsValue: false },
    { value: 'notset', label: 'is not set', needsValue: false },
    { value: 'eq', label: 'equals', needsValue: true },
    { value: 'ne', label: 'not equals', needsValue: true },
    { value: 'lt', label: 'less than', needsValue: true },
    { value: 'gt', label: 'greater than', needsValue: true },
    { value: 'lte', label: 'at most', needsValue: true },
    { value: 'gte', label: 'at least', needsValue: true },
    { value: 'in', label: 'is in', needsValue: true },
    { value: 'notin', label: 'is not in', needsValue: true },
]

const isSimple = (c: Condition): c is SimpleCondition => 'field' in c && 'op' in c
const isCompound = (c: Condition): c is CompoundCondition => 'and' in c || 'or' in c
const getLogic = (c: CompoundCondition): 'and' | 'or' => ('and' in c ? 'and' : 'or')
const getChildren = (c: CompoundCondition): Condition[] => ('and' in c ? c.and : c.or)

const makeSimple = (fields: FieldInfo[]): SimpleCondition => ({
    field: fields[0]?.id ?? 0,
    op: 'eq',
    value: '',
})

const opNeedsValue = (op: SimpleCondition['op']) => OPERATORS.find((o) => o.value === op)?.needsValue ?? true

const selectCls = 'rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white'
const inputCls = 'rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400'
const btnCls = 'text-xs text-blue-600 hover:text-blue-800'
const removeBtnCls = 'ml-1 text-gray-400 hover:text-red-500 text-sm leading-none flex-shrink-0'

const ValueInput: FC<{
    field: FieldInfo | undefined
    op: SimpleCondition['op']
    value: unknown
    onChange: (v: unknown) => void
}> = ({ field, op, value, onChange }) => {
    if (!opNeedsValue(op)) return null

    if (op === 'in' || op === 'notin') {
        return (
            <input
                type="text"
                value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                placeholder="val1, val2, ..."
                onChange={(e) =>
                    onChange(
                        e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                    )
                }
                className={`${inputCls} min-w-[120px] flex-1`}
            />
        )
    }

    if (field?.type === 'boolean') {
        return (
            <select
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value === 'true')}
                className={selectCls}>
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        )
    }

    if (field?.type === 'select' && field.options?.length) {
        return (
            <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                {field.options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                        {o.label}
                    </option>
                ))}
            </select>
        )
    }

    if (field?.type === 'number') {
        return (
            <input
                type="number"
                value={value != null ? String(value) : ''}
                placeholder="Value"
                onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                className={`${inputCls} min-w-[80px] flex-1`}
            />
        )
    }

    return (
        <input
            type="text"
            value={String(value ?? '')}
            placeholder="Value"
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} min-w-[80px] flex-1`}
        />
    )
}

const SimpleRow: FC<{
    condition: SimpleCondition
    fields: FieldInfo[]
    onChange: (c: SimpleCondition) => void
    onRemove: () => void
}> = ({ condition, fields, onChange, onRemove }) => {
    const targetField = useMemo(() => fields.find((f) => f.id === condition.field), [fields, condition.field])

    const handleFieldChange = useCallback(
        (id: number) => {
            onChange({ ...condition, field: id, value: undefined })
        },
        [condition, onChange],
    )

    const handleOpChange = useCallback(
        (op: SimpleCondition['op']) => {
            const next: SimpleCondition = { field: condition.field, op }
            if (opNeedsValue(op)) next.value = condition.value
            onChange(next)
        },
        [condition, onChange],
    )

    const handleValueChange = useCallback(
        (value: unknown) => {
            onChange({ ...condition, value })
        },
        [condition, onChange],
    )

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <select
                value={condition.field}
                onChange={(e) => handleFieldChange(Number(e.target.value))}
                className={`${selectCls} max-w-[140px]`}>
                {!targetField && <option value={condition.field}>#{condition.field} (unknown)</option>}
                {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                        {f.label} (#{f.id})
                    </option>
                ))}
            </select>

            <select
                value={condition.op}
                onChange={(e) => handleOpChange(e.target.value as SimpleCondition['op'])}
                className={selectCls}>
                {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>

            <ValueInput field={targetField} op={condition.op} value={condition.value} onChange={handleValueChange} />

            <button type="button" onClick={onRemove} className={removeBtnCls} title="Remove condition">
                &times;
            </button>
        </div>
    )
}

const CompoundGroup: FC<{
    condition: CompoundCondition
    fields: FieldInfo[]
    onChange: (c: Condition) => void
    onRemove?: () => void
    depth?: number
}> = ({ condition, fields, onChange, onRemove, depth = 0 }) => {
    const logic = getLogic(condition)
    const children = getChildren(condition)

    const rebuild = useCallback(
        (newLogic: 'and' | 'or', newChildren: Condition[]) => {
            if (newChildren.length === 0) {
                onRemove?.()
                return
            }
            if (newChildren[0]) {
                onChange(newChildren[0])
                return
            }
            onChange(newLogic === 'and' ? { and: newChildren } : { or: newChildren })
        },
        [onChange, onRemove],
    )

    const toggleLogic = useCallback(() => {
        const next = logic === 'and' ? 'or' : 'and'
        rebuild(next, children)
    }, [logic, children, rebuild])

    const updateChild = useCallback(
        (index: number, c: Condition) => {
            const next = [...children]
            next[index] = c
            rebuild(logic, next)
        },
        [children, logic, rebuild],
    )

    const removeChild = useCallback(
        (index: number) => {
            rebuild(
                logic,
                children.filter((_, i) => i !== index),
            )
        },
        [children, logic, rebuild],
    )

    const addRule = useCallback(() => {
        rebuild(logic, [...children, makeSimple(fields)])
    }, [children, logic, fields, rebuild])

    const addGroup = useCallback(() => {
        rebuild(logic, [...children, { and: [makeSimple(fields)] }])
    }, [children, logic, fields, rebuild])

    return (
        <div className={`rounded border border-gray-200 p-2.5 ${depth > 0 ? 'bg-gray-50/50' : ''}`}>
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Match</span>
                <button
                    type="button"
                    onClick={toggleLogic}
                    className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    {logic === 'and' ? 'all' : 'any'}
                </button>
                <span>of the following</span>
                {onRemove && (
                    <button type="button" onClick={onRemove} className={`${removeBtnCls} ml-auto`} title="Remove group">
                        &times;
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {children.map((child, i) => (
                    <ConditionNode
                        key={i}
                        condition={child}
                        fields={fields}
                        onChange={(c) => updateChild(i, c)}
                        onRemove={() => removeChild(i)}
                        depth={depth + 1}
                    />
                ))}
            </div>

            <div className="mt-2 flex gap-3">
                <button type="button" onClick={addRule} className={btnCls}>
                    + Rule
                </button>
                {depth < 2 && (
                    <button type="button" onClick={addGroup} className={btnCls}>
                        + Group
                    </button>
                )}
            </div>
        </div>
    )
}

const ConditionNode: FC<{
    condition: Condition
    fields: FieldInfo[]
    onChange: (c: Condition) => void
    onRemove: () => void
    depth?: number
}> = ({ condition, fields, onChange, onRemove, depth = 0 }) => {
    if (isSimple(condition)) {
        return <SimpleRow condition={condition} fields={fields} onChange={onChange} onRemove={onRemove} />
    }
    if (isCompound(condition)) {
        return (
            <CompoundGroup
                condition={condition}
                fields={fields}
                onChange={onChange}
                onRemove={onRemove}
                depth={depth}
            />
        )
    }
    return null
}

export const ConditionalEditor: FC<{
    condition: Condition | undefined
    fields: FieldInfo[]
    onChange: (condition: Condition | undefined) => void
}> = ({ condition, fields, onChange }) => {
    const addCondition = useCallback(() => {
        onChange(makeSimple(fields))
    }, [fields, onChange])

    const addGroup = useCallback(() => {
        onChange({ and: [makeSimple(fields)] })
    }, [fields, onChange])

    const handleChange = useCallback(
        (c: Condition) => {
            onChange(c)
        },
        [onChange],
    )

    const handleRemove = useCallback(() => {
        onChange(undefined)
    }, [onChange])

    if (!condition) {
        return (
            <div className="flex gap-3">
                <button type="button" onClick={addCondition} className={btnCls} disabled={fields.length === 0}>
                    + Condition
                </button>
                <button type="button" onClick={addGroup} className={btnCls} disabled={fields.length === 0}>
                    + Group
                </button>
            </div>
        )
    }

    // Single simple condition with option to add more
    if (isSimple(condition)) {
        return (
            <div className="flex flex-col gap-2">
                <SimpleRow condition={condition} fields={fields} onChange={handleChange} onRemove={handleRemove} />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ and: [condition, makeSimple(fields)] })}
                        className={btnCls}>
                        + Rule
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ and: [condition, { and: [makeSimple(fields)] }] })}
                        className={btnCls}>
                        + Group
                    </button>
                </div>
            </div>
        )
    }

    if (isCompound(condition)) {
        return <CompoundGroup condition={condition} fields={fields} onChange={handleChange} onRemove={handleRemove} />
    }

    return null
}
