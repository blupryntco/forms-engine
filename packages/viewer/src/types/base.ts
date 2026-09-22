import type { FieldContentItem, FieldSuggestion, FieldValidationError } from '@bluprynt/forms-core'

export type BaseViewFieldProps = {
    field: FieldContentItem
    errors: FieldValidationError[]
    /** Machine-proposed answer for this field. Absent when there is none. */
    suggestion?: FieldSuggestion
}

export type BaseEditFieldProps = BaseViewFieldProps & {
    onChange: (value: unknown) => void
    /**
     * Copies {@link BaseViewFieldProps.suggestion}'s value into this field's
     * value, keeping the suggestion in place. No-op when there is none.
     */
    onAcceptSuggestion?: () => void
    /**
     * Removes this field's suggestion, leaving its value untouched. No-op when
     * there is none.
     */
    onRejectSuggestion?: () => void
}

export type ErrorProps = {
    errors: FieldValidationError[]
    field: FieldContentItem
}
