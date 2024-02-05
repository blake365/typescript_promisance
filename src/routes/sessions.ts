// get session by empireId

import { Request, Response, Router } from 'express'
import { Not } from 'typeorm'
import Session from '../entity/Session'

// READ
const getSession = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const now = Date.now()
		const session = await Session.findOne({
			where: {
				empire_id: id,
				time: Not(0),
			},
			order: {
				createdAt: 'DESC',
			},
		})
		// console.log(session)
		// check if session is older than 1 hour
		if (session && now - session.createdAt.getTime() < 3600000) {
			return res.json({ result: true })
		} else {
			return res.json({ result: false })
		}
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getSession)

export default router
