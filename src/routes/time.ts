import { Request, Response, Router } from 'express'
import { attachGame } from '../middleware/game'
import Game from '../entity/Game'
import user from '../middleware/user'
import auth from '../middleware/auth'

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

const router = Router()

router.get('/', user, auth, attachGame, time)

export default router
