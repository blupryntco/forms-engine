'use client'

import type { FC, PropsWithChildren } from 'react'

import { Provider as JotaiProvider } from 'jotai'

import { jotai } from '@/shared/state/jotai'

const Providers: FC<PropsWithChildren> = ({ children }) => <JotaiProvider store={jotai}>{children}</JotaiProvider>

export { Providers }
