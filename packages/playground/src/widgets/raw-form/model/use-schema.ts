import { useCallback, useEffect, useState } from 'react'

import { PrimitiveAtom, useAtom } from 'jotai'

export const useSchema = <T>(atom: PrimitiveAtom<T | undefined>) => {
    const [schema, setSchema] = useAtom(atom)
    const [text, setText] = useState(() => JSON.stringify(schema, null, 2))
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        setText(JSON.stringify(schema, null, 2))
    }, [schema])

    const handleSchemaChange = useCallback(
        (text: string) => {
            setText(text)
            try {
                setSchema(JSON.parse(text))
                setError(false)
            } catch {
                setError(true)
            }
        },
        [setSchema],
    )

    return [text, error, handleSchemaChange] as const
}
