import type { DocumentValidationError } from './validation-results'

/**
 * Error thrown when form definition or document validation fails.
 *
 * Inspect {@link errors} for structured programmatic access to all
 * validation issues.
 *
 * @example
 * ```ts
 * try {
 *   const engine = new FormEngine(definition);
 * } catch (err) {
 *   if (err instanceof DocumentError) {
 *     for (const e of err.errors) {
 *       console.log(e.code, e.message);
 *     }
 *   }
 * }
 * ```
 */
export class DocumentError extends Error {
    /** Structured list of all validation errors. */
    readonly errors: DocumentValidationError[]

    /**
     * @param errors - One or more validation errors that caused the error.
     */
    constructor(errors: DocumentValidationError[]) {
        const summary = errors.map((e) => e.message).join('; ')
        super(`Document validation failed: ${summary}`)
        this.name = 'DocumentError'
        this.errors = errors
    }
}
