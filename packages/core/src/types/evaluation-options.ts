/**
 * Options for evaluating a form document (validation and visibility).
 *
 * @property now - Trusted reference time for relative dates (`"+7d"`, `"-1m"`).
 *   When set, it replaces `doc.form.submittedAt`, which the client controls.
 *   Pass it when validating on the server.
 */
export type EvaluationOptions = {
    now?: Date
}
