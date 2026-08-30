import { Router } from 'express'
import { getMetadata, getEntityMetadata } from '../shared/metadata'

export const metadataRouter = Router()

metadataRouter.get('/metadata', getMetadata)
metadataRouter.get('/metadata/:entity', getEntityMetadata)
