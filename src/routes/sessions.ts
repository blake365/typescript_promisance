// get session by empireId

import { Request, Response, Router } from 'express'
import { Not, Raw } from 'typeorm'
import Session from '../entity/Session'

// READ
const getSession = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const session = await Session.find({
			where: {
				empire_id: id,
				createdAt: Raw((alias) => `${alias} > NOW() - INTERVAL '1 hour'`),
				time: Not(0),
			},
			order: {
				createdAt: 'DESC',
			},
			take: 1,
			// cache: 30000,
		})

		return res.json(session)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getSession)

export default router
