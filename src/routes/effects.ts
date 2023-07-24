import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { getNetworth } from './actions/actions'
import { Not } from 'typeorm'
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

		let recent = effects[0]
		let now = new Date()

		const checkEffect = (effect) => {
			let effectAge =
				(now.valueOf() - new Date(effect.createdAt).getTime()) / 60000
			// age in minutes
			console.log(effectAge)
			effectAge = Math.floor(effectAge)
			if (effectAge > effect.empireEffectValue) {
				console.log('expired')
				console.log('create')
			} else if (effectAge < 9 * 60) {
				console.log('renew')
			} else {
				console.log('extend')
			}
		}

		checkEffect(recent)

		return res.json(effects)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', getEffects)

export default router
