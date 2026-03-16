import type { FC, PropsWithChildren } from 'react'

import './globals.css'

import { Providers } from '@/app/providers'

export const metadata = {
    title: 'Bluprynt Forms Playground',
}

const RootLayout: FC<PropsWithChildren> = ({ children }) => (
    <html lang="en">
        <body>
            <Providers>{children}</Providers>
        </body>
    </html>
)

export default RootLayout
