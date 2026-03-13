import { FormEditor, FormValuesEditor, FormViewer, ROOT } from './index'

describe('forms-viewer exports', () => {
    it('should export FormViewer component', () => {
        expect(FormViewer).toBeDefined()
        expect(typeof FormViewer).toBe('function')
    })

    it('should export FormEditor component', () => {
        expect(FormEditor).toBeDefined()
        expect(typeof FormEditor).toBe('function')
    })

    it('should export ROOT symbol', () => {
        expect(ROOT).toBeDefined()
        expect(typeof ROOT).toBe('symbol')
    })

    it('should export FormValuesEditor class', () => {
        expect(FormValuesEditor).toBeDefined()
        expect(typeof FormValuesEditor).toBe('function')
    })
})
