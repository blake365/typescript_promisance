import { Request, Response, Router } from 'express'

import EmpireEffect from '../entity/EmpireEffect'

// READ
const getEffects = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const effects = await EmpireEffect.find({
			where: { effectOwnerId: id, empireEffectName: 'time gate' },
			order: {
				createdAt: 'DESC',
			},
		})

		return res.json(effects)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getEffects)

export default router
