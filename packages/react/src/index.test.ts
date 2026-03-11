import { FormEditor, FormViewer, ROOT } from './index'

describe('forms-react exports', () => {
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
})
