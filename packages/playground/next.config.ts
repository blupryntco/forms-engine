import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'export',
    transpilePackages: ['@bluprynt/forms-core', '@bluprynt/forms-viewer'],
}

export default nextConfig
