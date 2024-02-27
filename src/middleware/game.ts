import { Request, Response, NextFunction } from 'express'

import Game from '../entity/Game'

export const attachGame = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gameId } = req.query
    const game = await Game.findOne({ where: { game_id: gameId } })
    res.locals.game = game
    
    next()
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: 'Error finding specified game.' })
  }
}
