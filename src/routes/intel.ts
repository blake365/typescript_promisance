import EmpireIntel from '../entity/EmpireIntel'
import { Request, Response, Router } from 'express'
import user from '../middleware/user'
import auth from '../middleware/auth'

const getIntel = async (req: Request, res: Response) => {
	const id = req.params.id

	const { user } = res.locals

	if (user.empires[0].id !== id) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const intel = await EmpireIntel.find({
			where: { ownerId: id },
			order: {
				createdAt: 'DESC',
			},
		})

		return res.json(intel)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getClanIntel = async (req: Request, res: Response) => {
	// console.log(req.body)
	let { ownerId } = req.body
	// console.log(ownerId)

	if (ownerId) {
		ownerId = ownerId.map((id) => {
			return { ownerId: id }
		})
	} else ownerId = { ownerId: 0 }
	console.log(ownerId)

	try {
		const intel = await EmpireIntel.find({
			where: ownerId,
			order: {
				createdAt: 'DESC',
			},
		})

		return res.json(intel)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getEmpireIntel = async (req: Request, res: Response) => {
	const { spiedEmpireId, ownerId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== ownerId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	// console.log(req.body)
	try {
		const intel = await EmpireIntel.find({
			where: { spiedEmpireId: spiedEmpireId, ownerId: ownerId },
			order: {
				createdAt: 'DESC',
			},
			take: 1,
		})

		return res.json(intel)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', user, auth, getIntel)
router.post('/clan', user, auth, getClanIntel)
router.post('/scores', user, auth, getEmpireIntel)

export default router
