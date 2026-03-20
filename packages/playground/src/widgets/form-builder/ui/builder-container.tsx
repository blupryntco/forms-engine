import type { FC, PropsWithChildren } from 'react'

export const BuilderContainer: FC<PropsWithChildren> = ({ children }) => (
    <div className="flex flex-col gap-4 p-2">{children}</div>
)
