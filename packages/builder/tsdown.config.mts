import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    deps: {
        neverBundle: [
            'react',
            '@bluprynt/forms-core',
            '@bluprynt/forms-viewer',
            '@dnd-kit/react',
            '@dnd-kit/helpers',
            '@dnd-kit/state',
        ],
    },
})
