import type { Request, Response } from 'express'
import { Router } from 'express'
import { attachGame } from '../middleware/game'
import type Game from '../entity/Game'
import user from '../middleware/user'
import auth from '../middleware/auth'
import Empire from '../entity/Empire'

// READ
const time = async (req: Request, res: Response) => {
	const game: Game = res.locals.game

	try {
		res.status(200).json({
			time: new Date().getTime(),
			start: new Date(game.roundStart).getTime(),
			end: new Date(game.roundEnd).getTime(),
		})
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const healthCheck = async (req: Request, res: Response) => {
	try {
		const empire = await Empire.find({ order: { createdAt: 'DESC' }, take: 1 })
		if (empire.length === 1) {
			return res.status(200).json({ message: 'Server is healthy' })
		}
	} catch {
		return res.status(500).json({ message: 'Database connection error' })
	}
}

const router = Router()

router.get('/', user, auth, attachGame, time)
router.get('/health', healthCheck)

export default router
