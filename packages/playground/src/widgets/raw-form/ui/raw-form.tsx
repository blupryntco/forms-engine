'use client'

import type { FC } from 'react'

import formDefinitionSchema from '@bluprynt/forms-core/schemas/form-definition.schema.json'

import { formDefinitionAtom, formDocumentAtom } from '@/entities/form'

import { SchemaEditor } from './schema-editor'

export const RawForm: FC = () => (
    <div className="flex flex-col bg-white">
        <SchemaEditor title="Form Definition" atom={formDefinitionAtom} schema={formDefinitionSchema} />
        <SchemaEditor title="Form Values" atom={formDocumentAtom} />
    </div>
)
