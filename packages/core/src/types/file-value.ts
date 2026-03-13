/**
 * Metadata for an uploaded file.
 *
 * The engine does not handle actual file upload -- the consumer handles upload
 * and produces the `FileValue` object.
 *
 * @property name - Original file name.
 * @property mimeType - MIME type of the file.
 * @property size - File size in bytes.
 * @property url - URL where the file can be accessed.
 */
export type FileValue = {
    name: string
    mimeType: string
    size: number
    url: string
}
