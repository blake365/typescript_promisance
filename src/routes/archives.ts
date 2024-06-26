import type { Request, Response } from 'express'
import { Router } from 'express'
import RoundHistory from '../entity/RoundHistory'
import EmpireHistory from '../entity/EmpireHistory'
import ClanHistory from '../entity/ClanHistory'

const getRounds = async (req: Request, res: Response) => {
	try {
		const rounds = await RoundHistory.find({
			order: {
				createdAt: 'DESC',
			},
		})

		return res.json(rounds)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getEmpireHistory = async (req: Request, res: Response) => {
	const { clan_id } = req.params
	console.log(clan_id)

	try {
		const empireHistory = await EmpireHistory.find({
			where: { clanHistory_id: clan_id },
			order: {
				empireHistoryRank: 'DESC',
			},
		})

		return res.json(empireHistory)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getClanHistory = async (req: Request, res: Response) => {
	const { roundHistory_id } = req.params

	try {
		const clanHistory = await ClanHistory.find({
			where: { roundHistory_id },
			order: {
				clanHistoryTotalNet: 'DESC',
			},
		})

		return res.json(clanHistory)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getOneEmpireHistory = async (req: Request, res: Response) => {
	const { roundHistory_id, empireHistory_id } = req.params

	try {
		const empireHistory = await EmpireHistory.findOne({
			where: { roundHistory_id, empireHistory_id },
		})

		return res.json(empireHistory)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getHistory = async (req: Request, res: Response) => {
	const { roundHistory_id } = req.params

	try {
		const roundHistory = await RoundHistory.findOne({
			where: { round_h_id: roundHistory_id },
		})

		const empireHistory = await EmpireHistory.find({
			where: { roundHistory_id },
			order: {
				empireHistoryRank: 'ASC',
			},
		})

		const clanHistory = await ClanHistory.find({
			where: { roundHistory_id },
			order: {
				clanHistoryTotalNet: 'ASC',
			},
		})

		return res.json({ roundHistory, empireHistory, clanHistory })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/', getRounds)
router.get('/:roundHistory_id', getHistory)
// router.get('/empires/:roundHistory_id', getEmpireHistory)
router.get('/empires/:clan_id', getEmpireHistory)
// router.get('/clans/:roundHistory_id', getClanHistory)
// router.get('/empires/:roundHistory_id/:empireHistory_id', getOneEmpireHistory)

export default router
