import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'

import {
	TURNS_PROTECTION,
	LOTTERY_MAXTICKETS,
	LOTTERY_JACKPOT,
} from '../config/conifg'
import User from '../entity/User'
import Lottery from '../entity/Lottery'
import { generalLog } from '../functions/functions'

// lottery
// set base jackpot
const base = LOTTERY_JACKPOT

// buy lottery ticket
// add to lottery db
// check if enough money, limit on tickets, etc
const buyTicket = async (req: Request, res: Response) => {
	const { empireId, type } = req.body

	if (type !== 'lottery') {
		return res.status(400).json({ error: 'invalid request' })
	}

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	const empire = await Empire.findOne({ id: empireId })

	if (empire.turnsUsed < TURNS_PROTECTION || empire.mode === 'demo') {
		return res.status(400).json({ error: 'not allowed' })
	}

	const allTickets = await Lottery.find()
	const empireTickets = await Lottery.find({
		where: { empire_id: empireId },
		order: {
			createdAt: 'DESC',
		},
	})

	let ticketCost = Math.round(empire.networth / generalLog(empire.networth, 25))

	if (empire.cash < ticketCost) {
		return res
			.status(400)
			.json({ error: 'Not enough money to purchase ticket' })
	}

	if (empireTickets.length >= LOTTERY_MAXTICKETS) {
		return res.status(400).json({ error: 'Max tickets reached' })
	} else {
		empire.cash -= ticketCost
		await empire.save()

		const ticket = new Lottery()
		ticket.empire_id = empireId
		ticket.cash = ticketCost
		ticket.ticket = allTickets.length + 1
		await ticket.save()

		return res.json({ success: 'Ticket Purchased!' })
	}
}

const getJackpot = async (req: Request, res: Response) => {
	const allTickets = await Lottery.find()

	let jackpot: number = 0
	const jackpotTracker = await Lottery.findOne({ ticket: 0 })
	// console.log(jackpotTracker)
	if (!jackpotTracker) {
		jackpot += LOTTERY_JACKPOT
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
	const tickets = await Lottery.findAndCount({
		where: { ticket: Not(0) },
	})

	return res.json({ success: tickets[1] })
}

// increase jackpot for each ticket bought

const router = Router()

router.post('/buyTicket', user, auth, buyTicket)
router.get('/getJackpot', getJackpot)
router.get('/getTickets/:empireId', getTickets)
router.get('/getTotalTickets', getTotalTickets)

export default router
