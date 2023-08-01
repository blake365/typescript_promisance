import EmpireIntel from '../entity/EmpireIntel'
import { Request, Response, Router } from 'express'
import user from '../middleware/user'
import auth from '../middleware/auth'

const getIntel = async (req: Request, res: Response) => {
	const id = req.params.id

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

const router = Router()

router.get('/:id', user, auth, getIntel)

export default router
