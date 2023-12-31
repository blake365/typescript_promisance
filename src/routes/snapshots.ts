// get empire snapshots by id

import { Request, Response, Router } from 'express'
import EmpireSnapshot from '../entity/EmpireSnapshot'
import auth from '../middleware/auth'
import user from '../middleware/user'
import User from '../entity/User'

// READ
const getSnapshot = async (req: Request, res: Response) => {
	const { id } = req.params
	const user: User = res.locals.user

	// if (user.empires[0].id !== Number(id)) {
	// 	return res.status(500).json({ error: 'Empire ID mismatch' })
	// }

	try {
		const snapshot = await EmpireSnapshot.find({
			where: {
				e_id: id,
			},
			order: {
				createdAt: 'ASC',
			},
		})

		return res.json(snapshot)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getSnapshot)

export default router
