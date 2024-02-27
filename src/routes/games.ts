import { Router, Request, Response } from 'express'

import user from '../middleware/user'
import { isAdmin } from '../middleware/admin'
import auth from '../middleware/auth'
import Game from '../entity/Game'

const getGames = async (req: Request, res: Response) => {
  const games = await Game.find({ where: { isActive: true } })
  const { empires } = res.locals.user

  const { gamesUserIsIn, gamesUserNotIn } = games.reduce((x, game) => {
    const userInGame = empires.some((empire) => empire.game.game_id === game.game_id)
    if (userInGame) {
      x.gamesUserIsIn.push(game)
    } else {
      x.gamesUserNotIn.push(game)
    }
    return x
  }, { gamesUserIsIn: [], gamesUserNotIn: [] })

  return res.json({ gamesUserIsIn, gamesUserNotIn })
}

const createGame = async (req: Request, res: Response) => {
  const game: any = await Game.create(req.body)
  await game.save()

  return res.json(game)
}

const router = Router()

router.get('/', user, auth, getGames)
router.post('/', isAdmin, createGame)

export default router
