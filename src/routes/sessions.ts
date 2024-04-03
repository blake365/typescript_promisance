// get session by empireId

import type { Request, Response } from 'express'
import { Router } from 'express'
import { Not } from 'typeorm'
import Session from '../entity/Session'
import user from '../middleware/user'
import auth from '../middleware/auth'

// READ
const getSession = async (req: Request, res: Response) => {
	const { id } = req.params
	// console.log(id)

	try {
		const now = new Date().getTime()
		const session = await Session.findOne({
			where: {
				empire_id: Number(id),
				time: Not(0),
			},
			order: {
				createdAt: 'DESC',
			},
		})
		// console.log(session)
		// console.log(now)
		// console.log(session.createdAt.getTime())
		// console.log(now - session.createdAt.getTime())
		// check if session is older than 1 hour
		if (session && now - session.createdAt.getTime() < 3600000) {
			// console.log('session found')
			return res.json({ result: true })
		}
		// console.log('session not found')
		return res.json({ result: false })
	} catch (error) {
		console.log(error)
		return res.status(500).json({ result: false })
	}
}

const setSession = async (req: Request, res: Response) => {
	const { id } = req.params
	const user_id = res.locals.user.id
	const { token } = res.locals

	// console.log(req.params)
	const data = token
	const time = 3600

	try {
		const session = new Session()
		session.data = data
		session.time = time
		session.user_id = user_id
		session.empire_id = Number(id)
		session.role = 'user'
		await session.save()
		// console.log('session saved')
		return res.status(200)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getSession)
router.post('/:id', user, auth, setSession)

export default router
