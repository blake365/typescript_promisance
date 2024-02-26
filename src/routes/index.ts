import { Router } from 'express'
import games from './games'

const router = Router()

router.use('/games', games)

export default router
