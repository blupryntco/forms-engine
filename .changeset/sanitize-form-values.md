---
"@bluprynt/forms-core": patch
---

Add a way to strip values the form definition does not accept.

`validate` used to ignore values outside the visible fields, so a client could attach arbitrary data to a document
and consumers stored it. `FormEngine.sanitize(doc, options?)` returns a copy of the document without unknown
`values` keys, values on `section` and `static` ids, values of hidden fields, and undeclared keys in `array_obj` rows.
`suggestions` is cleaned by the same rules. `FormValuesEditor.sanitize(options?)` does the same to the editor's
document. Servers should persist `engine.sanitize(doc, { now: new Date() })`. Hidden values are dropped for good, so
sanitize on save or submit, not on every edit.

`EvaluationOptions` gets a `strict` flag, read by `validate` only. With `strict: true`, each value `sanitize` would
remove from `values` becomes one of the new document errors `UNKNOWN_VALUE_KEY`, `NON_VALUE_ITEM_VALUE`,
`HIDDEN_FIELD_VALUE` or `UNKNOWN_ROW_KEY`, and `valid` is `false`. Without `strict`, behaviour is unchanged.
