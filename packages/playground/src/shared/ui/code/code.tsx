'use client'

import type { ComponentProps, FC } from 'react'
import { useCallback, useId } from 'react'

import Editor, { type BeforeMount, type Monaco, type OnChange } from '@monaco-editor/react'

type CodeProps = {
    value: string
    onChange?: (value: string) => void
    schema?: Record<string, unknown>
}

const MONACO_OPTIONS: ComponentProps<typeof Editor>['options'] = {
    minimap: { enabled: false },
    fontSize: 12,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    lineNumbers: 'on',
    folding: true,
    wordWrap: 'on',
    readOnly: false,
}

export const Code: FC<CodeProps> = ({ value, onChange, schema }) => {
    const modelPath = `inmemory://code/${useId()}.json`

    const handleBeforeMount = useCallback<BeforeMount>(
        (monaco: Monaco) => {
            if (!schema) return

            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                allowComments: true,
                trailingCommas: 'error',
                schemas: [
                    {
                        uri: modelPath,
                        fileMatch: [modelPath],
                        schema,
                    },
                ],
            })
        },
        [schema, modelPath],
    )

    const handleChange = useCallback<NonNullable<OnChange>>(
        (v) => {
            onChange?.(v ?? '')
        },
        [onChange],
    )

    return (
        <Editor
            language="json"
            value={value}
            onChange={handleChange}
            beforeMount={handleBeforeMount}
            path={modelPath}
            options={{ ...MONACO_OPTIONS, readOnly: !onChange }}
        />
    )
}
