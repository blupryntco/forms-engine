/**
 * Options for evaluating a form document (validation and visibility).
 *
 * @property now - Trusted reference time for relative dates (`"+7d"`, `"-1m"`).
 *   When set, it replaces `doc.form.submittedAt`, which the client controls.
 *   Pass it when validating on the server.
 * @property strict - `validate` only: also report values that `sanitize` would
 *   remove (unknown keys, values on `section`/`static` ids, hidden-field values,
 *   undeclared `array_obj` row keys) as document errors. Ignored elsewhere.
 */
export type EvaluationOptions = {
    now?: Date
    strict?: boolean
}
