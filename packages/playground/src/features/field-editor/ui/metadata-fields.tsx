import type { FC } from 'react'

import type { EditorFormik } from '../model/editor-form'
import { Label, TextInput } from './primitives'

/**
 * The three optional authoring-metadata inputs shared by fields and sections.
 *
 * `description` stays with the per-kind forms because it already lives there;
 * these three are new and always travel together.
 */
export const MetadataFields: FC<{ formik: EditorFormik }> = ({ formik }) => (
    <>
        <div>
            <Label>Placeholder</Label>
            <div className="mt-1">
                <TextInput
                    value={formik.values.placeholder}
                    placeholder="Shown inside the empty input"
                    onChange={(v) => formik.setFieldValue('placeholder', v)}
                />
            </div>
        </div>

        <div>
            <Label>Answer guidelines</Label>
            <div className="mt-1">
                <TextInput
                    value={formik.values.answerGuidelines}
                    placeholder="How this should be answered"
                    onChange={(v) => formik.setFieldValue('answerGuidelines', v)}
                />
            </div>
        </div>

        <div>
            <Label>Reference id</Label>
            <div className="mt-1">
                <TextInput
                    value={formik.values.referenceId}
                    placeholder="e.g. KYI-3.1.a"
                    onChange={(v) => formik.setFieldValue('referenceId', v)}
                />
            </div>
        </div>
    </>
)
