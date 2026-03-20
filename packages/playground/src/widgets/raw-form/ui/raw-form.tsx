'use client'

import type { FC } from 'react'
import { Pane, SplitPane } from 'react-split-pane'

import formDefinitionSchema from '@bluprynt/forms-core/schemas/form-definition.schema.json'

import { formDefinitionAtom, formDocumentAtom } from '@/entities/form'

import { SchemaEditor } from './schema-editor'

export const RawForm: FC = () => (
    <div className="h-full bg-white">
        <SplitPane direction="vertical" className="h-full">
            <Pane defaultSize="50%" minSize="100px" className="flex flex-col border-b border-gray-200">
                <SchemaEditor title="Form Definition" atom={formDefinitionAtom} schema={formDefinitionSchema} />
            </Pane>
            <Pane minSize="100px" className="flex flex-col">
                <SchemaEditor title="Form Values" atom={formDocumentAtom} />
            </Pane>
        </SplitPane>
    </div>
)
