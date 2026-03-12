'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
    DocumentValidationError,
    FormDefinition,
    FormDocument,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { FormEngine } from '@bluprynt/forms-core'
import formDefinitionSchema from '@bluprynt/forms-core/schemas/form-definition.schema.json'
import { FormEditor, FormViewer, ROOT } from '@bluprynt/forms-react'
import Editor, { type Monaco } from '@monaco-editor/react'

import { editorComponents } from '../components/editor'
import { viewerComponents } from '../components/viewer'
import { SAMPLE_FORMS } from '../sample-forms'

const DEFINITION_MODEL_URI = 'inmemory://playground/definition.json'
const VALUES_MODEL_URI = 'inmemory://playground/values.json'

const MONACO_OPTIONS = {
    minimap: { enabled: false },
    fontSize: 12,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    lineNumbers: 'on' as const,
    folding: true,
    wordWrap: 'on' as const,
} as const

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

const tryParseJson = <T,>(text: string): ParseResult<T> => {
    try {
        return { ok: true, data: JSON.parse(text) as T }
    } catch (e) {
        return { ok: false, error: (e as Error).message }
    }
}

const buildFormDocument = (definition: FormDefinition, values: FormValues, submittedAt?: string): FormDocument => ({
    form: { id: definition.id, version: definition.version, submittedAt: submittedAt ?? new Date().toISOString() },
    values,
})

type EngineResult = { ok: true; engine: FormEngine; definition: FormDefinition } | { ok: false; error: string }

type SectionTab = {
    key: string
    label: string
    description?: string
    value: typeof ROOT | number
}

const buildSectionTabs = (definition: FormDefinition): SectionTab[] => {
    const tabs: SectionTab[] = []
    const hasRootFields = definition.content.some((item) => item.type !== 'section')
    if (hasRootFields) {
        tabs.push({ key: 'root', label: 'General', value: ROOT })
    }
    for (const item of definition.content) {
        if (item.type === 'section') {
            const section = item as SectionContentItem
            tabs.push({
                key: String(section.id),
                label: section.title,
                description: section.description,
                value: section.id,
            })
        }
    }
    return tabs
}

export default function Home() {
    const initial = SAMPLE_FORMS[0]!
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [definitionText, setDefinitionText] = useState(() => JSON.stringify(initial.definition, null, 2))
    const [valuesText, setValuesText] = useState(() =>
        JSON.stringify(buildFormDocument(initial.definition, initial.values, initial.submittedAt), null, 2),
    )
    const [formDoc, setFormDoc] = useState<FormDocument>(() =>
        buildFormDocument(initial.definition, initial.values, initial.submittedAt),
    )
    const [showValidation, setShowValidation] = useState(false)
    const [sectionSteps, setSectionSteps] = useState(false)
    const [activeTabKey, setActiveTabKey] = useState('root')
    const [documentErrors, setDocumentErrors] = useState<DocumentValidationError[]>([])
    const monacoRef = useRef<Monaco | null>(null)

    const handleDocumentError = useCallback((errors: DocumentValidationError[]) => {
        setDocumentErrors(errors)
    }, [])

    const handleMonacoBeforeMount = useCallback((monaco: Monaco) => {
        monacoRef.current = monaco
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
            trailingCommas: 'error',
            schemas: [
                {
                    uri: 'inmemory://playground/form-definition-schema.json',
                    fileMatch: [DEFINITION_MODEL_URI],
                    schema: formDefinitionSchema as Record<string, unknown>,
                },
            ],
        })
    }, [])

    const handleSelectForm = useCallback((index: number) => {
        const sample = SAMPLE_FORMS[index]!
        const doc = buildFormDocument(sample.definition, sample.values, sample.submittedAt)
        setSelectedIndex(index)
        setDefinitionText(JSON.stringify(sample.definition, null, 2))
        setValuesText(JSON.stringify(doc, null, 2))
        setFormDoc(doc)
        setActiveTabKey('root')
        setDocumentErrors([])
    }, [])

    // Clear document errors when inputs change (callback will re-set if still present)
    useEffect(() => {
        setDocumentErrors([])
    }, [definitionText, formDoc])

    // Parse definition and build engine
    const engineResult: EngineResult = useMemo(() => {
        const parsed = tryParseJson<FormDefinition>(definitionText)
        if (!parsed.ok) return { ok: false, error: `JSON parse error: ${parsed.error}` }
        try {
            const engine = new FormEngine(parsed.data)
            return { ok: true, engine, definition: parsed.data }
        } catch (e) {
            return { ok: false, error: (e as Error).message }
        }
    }, [definitionText])

    // Build section tabs from definition
    const sectionTabs = useMemo(
        () => (engineResult.ok ? buildSectionTabs(engineResult.definition) : []),
        [engineResult],
    )

    // Resolve active section prop value
    const resolvedTabKey = sectionTabs.some((t) => t.key === activeTabKey)
        ? activeTabKey
        : (sectionTabs[0]?.key ?? 'root')
    const activeSection = useMemo(() => {
        if (!sectionSteps) return undefined
        const tab = sectionTabs.find((t) => t.key === resolvedTabKey)
        return tab?.value
    }, [sectionSteps, sectionTabs, resolvedTabKey])

    // Parse values from textarea
    const valuesParseResult = useMemo(() => tryParseJson<FormDocument>(valuesText), [valuesText])

    // Sync parsed values to state when textarea changes
    const handleValuesTextChange = useCallback((text: string) => {
        setValuesText(text)
        const parsed = tryParseJson<FormDocument>(text)
        if (parsed.ok) {
            setFormDoc(parsed.data)
        }
    }, [])

    // Handle editor onChange — update values state and textarea
    const handleEditorChange = useCallback((newDoc: FormDocument) => {
        setFormDoc(newDoc)
        setValuesText(JSON.stringify(newDoc, null, 2))
    }, [])

    const definitionError = engineResult.ok ? null : engineResult.error
    const valuesError = valuesParseResult.ok ? null : valuesParseResult.error

    const renderSectionTabs = () =>
        sectionSteps &&
        sectionTabs.length > 0 && (
            <div className="flex gap-0 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2">
                {sectionTabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTabKey(tab.key)}
                        className={`shrink-0 border-b-2 px-3 py-2 text-xs transition-colors ${
                            resolvedTabKey === tab.key
                                ? 'border-blue-500 text-blue-700'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                        title={tab.description}>
                        {tab.label}
                    </button>
                ))}
            </div>
        )

    return (
        <div className="flex h-screen flex-col bg-gray-100">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
                <h1 className="text-lg font-semibold text-gray-800">Bluprynt Forms Playground</h1>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedIndex}
                        onChange={(e) => handleSelectForm(Number(e.target.value))}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-500">
                        {SAMPLE_FORMS.map((sample, i) => (
                            <option key={sample.definition.id} value={i}>
                                {sample.label}
                            </option>
                        ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={sectionSteps}
                            onChange={(e) => {
                                setSectionSteps(e.target.checked)
                                setActiveTabKey('root')
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        Group sections
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={showValidation}
                            onChange={(e) => setShowValidation(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        Show validation
                    </label>
                </div>
            </header>

            {/* 3-column layout */}
            <div className="grid min-h-0 flex-1 grid-cols-3 gap-px bg-gray-300">
                {/* Left column: JSON editors */}
                <div className="flex flex-col bg-white">
                    <div className="flex min-h-0 flex-1 flex-col border-b border-gray-300">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Form Definition</span>
                            {definitionError && (
                                <span className="max-w-[40%] truncate text-xs text-red-600">{definitionError}</span>
                            )}
                        </div>
                        <div className="min-h-0 flex-1">
                            <Editor
                                language="json"
                                value={definitionText}
                                onChange={(v) => setDefinitionText(v ?? '')}
                                beforeMount={handleMonacoBeforeMount}
                                path={DEFINITION_MODEL_URI}
                                options={MONACO_OPTIONS}
                            />
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Form Values</span>
                            {valuesError && (
                                <span className="max-w-[60%] truncate text-xs text-red-600">{valuesError}</span>
                            )}
                        </div>
                        <div className="min-h-0 flex-1">
                            <Editor
                                language="json"
                                value={valuesText}
                                onChange={(v) => handleValuesTextChange(v ?? '')}
                                path={VALUES_MODEL_URI}
                                options={MONACO_OPTIONS}
                            />
                        </div>
                    </div>
                </div>

                {/* Middle column: FormViewer */}
                <div className="flex flex-col overflow-hidden bg-white">
                    <div className="border-b border-gray-200 bg-white px-3 py-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">Viewer (read-only)</span>
                    </div>
                    {renderSectionTabs()}
                    {documentErrors.length > 0 && (
                        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-medium text-amber-800">Document compatibility errors:</p>
                            <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                                {documentErrors.map((err) => (
                                    <li key={err.code}>{err.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4">
                        {engineResult.ok ? (
                            <FormViewer
                                definition={engineResult.definition}
                                data={formDoc}
                                components={viewerComponents}
                                showValidation={showValidation}
                                section={activeSection}
                                onDocumentError={handleDocumentError}
                            />
                        ) : (
                            <p className="text-sm text-gray-400 italic">Fix definition errors to preview</p>
                        )}
                    </div>
                </div>

                {/* Right column: FormEditor */}
                <div className="flex flex-col overflow-hidden bg-white">
                    <div className="border-b border-gray-200 bg-white px-3 py-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">Editor</span>
                    </div>
                    {renderSectionTabs()}
                    {documentErrors.length > 0 && (
                        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-medium text-amber-800">Document compatibility errors:</p>
                            <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                                {documentErrors.map((err) => (
                                    <li key={err.code}>{err.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4">
                        {engineResult.ok ? (
                            <FormEditor
                                definition={engineResult.definition}
                                data={formDoc}
                                components={editorComponents}
                                onChange={handleEditorChange}
                                showValidation={showValidation}
                                section={activeSection}
                                onDocumentError={handleDocumentError}
                            />
                        ) : (
                            <p className="text-sm text-gray-400 italic">Fix definition errors to preview</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
