import { Request, Response, NextFunction } from 'express'

import Game from '../entity/Game'

export const attachGame = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { gameId } = req.query
		// console.log(gameId)
		// console.log(res.locals.user.empires[0].game_id)
		if (!gameId) return res.status(400).json({ error: 'Game ID is required.' })

		const game = await Game.findOne({ where: { game_id: gameId } })
		// console.log(game)
		res.locals.game = game

		next()
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'Error finding specified game.' })
	}
}
