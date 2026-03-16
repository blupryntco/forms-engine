'use client'

import type { PrimitiveAtom } from 'jotai'

import { Code } from '@/shared/ui/code'

import { useSchema } from '../model/use-schema'

type SchemaEditorProps<T> = {
    atom: PrimitiveAtom<T | undefined>
    schema?: Record<string, unknown>
    title: string
}

export function SchemaEditor<T>({ atom, schema, title }: SchemaEditorProps<T>) {
    const [text, error, handleChange] = useSchema(atom)
    return (
        <>
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                <span className="text-xs font-medium text-gray-500 uppercase">{title}</span>
                {error && <span className="max-w-[40%] truncate text-xs text-red-600">Schema Error</span>}
            </div>
            <div className="min-h-0 flex-1">
                <Code value={text} onChange={handleChange} schema={schema} />
            </div>
        </>
    )
}
