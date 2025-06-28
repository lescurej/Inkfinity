import { nanoid } from 'nanoid'

export const uuidv4 = (): string => nanoid(32) // UUID de 32 caractères pour plus de fiabilité 