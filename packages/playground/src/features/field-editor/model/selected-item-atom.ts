import { atom } from 'jotai'

export const selectedItemIdAtom = atom<number | null>(null)
export const editorModeAtom = atom<'add' | 'edit'>('edit')
