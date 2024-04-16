import type { Request, Response } from 'express'
import { Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'
import Lottery from '../entity/Lottery'
import { generalLog } from '../functions/functions'
import { attachGame } from '../middleware/game'
import type Game from '../entity/Game'
// lottery
// set base jackpot

// buy lottery ticket
// add to lottery db
// check if enough money, limit on tickets, etc
const buyTicket = async (req: Request, res: Response) => {
	const { empireId, type } = req.body

	const game: Game = res.locals.game

	if (type !== 'lottery') {
		return res.status(400).json({ error: 'invalid request' })
	}

	const empire = await Empire.findOne({ id: empireId })

	if (empire.turnsUsed < game.turnsProtection || empire.mode === 'demo') {
		return res.status(400).json({ error: 'not allowed' })
	}

	const allTickets = await Lottery.find()
	const empireTickets = await Lottery.find({
		where: { empire_id: empireId },
		order: {
			createdAt: 'DESC',
		},
	})

	const ticketCost = Math.round(
		empire.networth / generalLog(empire.networth, 25)
	)

	if (empire.cash < ticketCost) {
		return res
			.status(400)
			.json({ error: 'Not enough money to purchase ticket' })
	}

	if (empireTickets.length >= game.lotteryMaxTickets) {
		return res.status(400).json({ error: 'Max tickets reached' })
	}

	empire.cash -= ticketCost
	await empire.save()

	const ticket = new Lottery()
	ticket.empire_id = empireId
	ticket.cash = ticketCost * 10
	ticket.ticket = allTickets.length + 1
	await ticket.save()

	return res.json({ success: 'Ticket Purchased!' })
}

const getJackpot = async (req: Request, res: Response) => {
	const game: Game = res.locals.game

	const allTickets = await Lottery.find({ where: { game_id: game.id } })

	let jackpot = 0
	const jackpotTracker = await Lottery.findOne({ ticket: 0, game_id: game.id })
	// console.log(jackpotTracker)
	if (!jackpotTracker) {
		jackpot += game.lotteryJackpot
		for (let i = 0; i < allTickets.length; i++) {
			// console.log(jackpot)
			jackpot = jackpot + Number(allTickets[i].cash)
		}
	} else {
		for (let i = 0; i < allTickets.length; i++) {
			jackpot += Number(allTickets[i].cash)
		}
	}

	return res.json({ success: jackpot })
}

const getTickets = async (req: Request, res: Response) => {
	const { empireId } = req.params

	const tickets = await Lottery.findAndCount({
		where: { empire_id: empireId },
	})

	return res.json({ success: tickets[1] })
}

const getTotalTickets = async (req: Request, res: Response) => {
	const { gameId } = req.query
	console.log(gameId)
	const tickets = await Lottery.findAndCount({
		where: { ticket: Not(0), game_id: gameId },
	})

	return res.json({ success: tickets[1] })
}

// increase jackpot for each ticket bought

const router = Router()

router.post('/buyTicket', user, auth, attachGame, buyTicket)
router.get('/getJackpot', attachGame, getJackpot)
router.get('/getTickets/:empireId', getTickets)
router.get('/getTotalTickets', getTotalTickets)

export default router
