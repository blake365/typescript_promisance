import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { getNetworth } from './actions/actions'
import { Not } from 'typeorm'
import EmpireEffect from '../entity/EmpireEffect'

// interface resultObject {
// 	name: string
// 	land: number
// 	empireId: number
// 	era: number
// 	race: number
// }

//CREATE
const createEmpire = async (req: Request, res: Response) => {
	let { name, race } = req.body

	const user: User = res.locals.user

	let mode = 'normal'
	let turns: number = 250
	let mktArm: number = 999999999999
	let mktLnd: number = 999999999999
	let mktFly: number = 999999999999
	let mktSea: number = 999999999999
	let mktFood: number = 999999999999

	if (user.role === 'demo') {
		mode = 'demo'
		turns = 2000
	}

	if (name.trim() === '') {
		return res.status(400).json({ name: 'Name must not be empty' })
	}

	try {
		let empire: Empire = null

		if (user.role === 'demo') {
			mode = 'demo'
			turns = 2000
			empire = new Empire({
				name,
				race,
				user,
				mode,
				turns,
				mktArm,
				mktFly,
				mktFood,
				mktLnd,
				mktSea,
			})
		} else {
			empire = new Empire({ name, race, user, mode, turns })
		}

		await empire.save()
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'Something went wrong' })
	}
}

// READ
const getEmpires = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find({
			order: {
				id: 'ASC',
			},
		})
		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// GET OTHER EMPIRES
const getOtherEmpires = async (req: Request, res: Response) => {
	// console.log('get other empires')
	// console.log(req.body)
	const empire_id = res.locals.user.empires[0].id
	// console.log(res.locals.user)
	// console.log(empire_id)
	const { empireId } = req.body
	// console.log(empire_id)

	if (empire_id !== empireId) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	const otherEmpires = await Empire.find({
		where: { empireId: Not(empire_id) },
		order: {
			empireId: 'ASC',
		},
	})
	// console.log(otherEmpires)

	return res.json(otherEmpires)
}

// GET EMPIRE LIST FOR SCORES
const getScores = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find({
			select: [
				'id',
				'name',
				'networth',
				'empireId',
				'race',
				'era',
				'land',
				'rank',
				'mode',
				'turnsUsed',
				'profile',
				'profileIcon',
			],
			order: {
				rank: 'ASC',
			},
		})
		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// UPDATE

const updateTax = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { tax } = req.body

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		empire.tax = tax
		await empire.save()
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

const updateIndustry = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { indArmy, indFly, indLnd, indSea } = req.body

	if (indArmy + indFly + indLnd + indSea !== 100) {
		return res.status(500).json({ error: 'Must add up to 100' })
	}

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		if (indArmy === 0) {
			empire.indArmy = 0
		} else {
			empire.indArmy = indArmy || empire.indArmy
		}
		if (indLnd === 0) {
			empire.indLnd = 0
		} else {
			empire.indLnd = indLnd || empire.indLnd
		}
		if (indFly === 0) {
			empire.indFly = 0
		} else {
			empire.indFly = indFly || empire.indFly
		}
		if (indSea === 0) {
			empire.indSea = 0
		} else {
			empire.indSea = indSea || empire.indSea
		}
		await empire.save()
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// Bank
const bank = async (req: Request, res: Response) => {
	const { uuid } = req.params
	let { depositAmt, withdrawAmt, type, loanAmt, repayAmt } = req.body

	console.log(req.body)

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		// const size = calcSizeBonus(empire)

		const maxLoan = empire.networth * 50
		let maxSavings = empire.networth * 100
		if (empire.cash < maxSavings) maxSavings = empire.cash

		if (repayAmt > empire.loan) {
			repayAmt = empire.loan
		}

		let depositResult = null
		let withdrawResult = null
		let loanResult = null
		let repayResult = null

		if (type === 'savings') {
			if (depositAmt !== 0 && depositAmt <= maxSavings - empire.bank) {
				empire.cash -= depositAmt
				empire.bank += depositAmt
				empire.networth = getNetworth(empire)
				depositResult = { action: 'deposit', amount: depositAmt }

				await empire.save()
			}

			if (withdrawAmt !== 0 && withdrawAmt <= empire.bank) {
				empire.bank -= withdrawAmt
				empire.cash += withdrawAmt
				empire.networth = getNetworth(empire)

				withdrawResult = { action: 'withdraw', amount: withdrawAmt }

				await empire.save()
			}
		}

		if (type === 'loan') {
			if (loanAmt !== 0 && loanAmt <= maxLoan - empire.loan) {
				empire.cash += loanAmt
				empire.loan += loanAmt
				empire.networth = getNetworth(empire)

				loanResult = { action: 'loan', amount: loanAmt }

				await empire.save()
			}

			if (repayAmt !== 0 && repayAmt <= empire.cash) {
				empire.cash -= repayAmt
				empire.loan -= repayAmt
				empire.networth = getNetworth(empire)

				repayResult = { action: 'repay', amount: repayAmt }

				await empire.save()
			}
		}

		let bankResult = [depositResult, withdrawResult, loanResult, repayResult]

		bankResult = bankResult.filter(Boolean)
		console.log(bankResult)

		return res.json(bankResult)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// DELETE
const deleteEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		await empire.remove()
		return res.json({ message: 'empire deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// FIND ONE
const findOneEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params

	const user: User = res.locals.user

	try {
		const empire = await Empire.findOneOrFail({ uuid }, { relations: ['user'] })
		// console.log('empire', empire)
		const effects = await EmpireEffect.find({
			where: { effectOwnerId: empire.empireId },
		})
		// console.log('user', user)
		// console.log(effects)
		if (user.username !== empire.user.username) {
			return res.status(403).json({ error: 'unauthorized' })
		}

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const getEmpireEffects = async (req: Request, res: Response) => {
	const { empireId } = req.body

	function isOld(createdAt, effectValue) {
		let effectAge =
			(Date.now().valueOf() - new Date(createdAt).getTime()) / 60000
		effectAge = Math.floor(effectAge)

		// console.log(effectAge)
		// console.log(effectValue)

		if (effectAge > effectValue) {
			return false
		} else {
			return true
		}
	}

	try {
		let effects = await EmpireEffect.find({
			where: { effectOwnerId: empireId },
		})
		// console.log('user', user)
		// console.log(effects)

		let filterEffects = effects.filter((effect) =>
			isOld(effect.createdAt, effect.empireEffectValue)
		)

		return res.json(filterEffects)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire effects not found' })
	}
}

const addEmpireEffect = async (req: Request, res: Response) => {
	// const {uuid} = req.params
	const { empireId, effectName, effectValue } = req.body

	let effectOwnerId = empireId
	let empireEffectName = effectName
	let empireEffectValue = effectValue

	try {
		let effect: EmpireEffect = null
		effect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await effect.save()
		return res.status(201).json(effect)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire effects not found' })
	}
}

const updateEmpireFavorite = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { favorite } = req.body

	console.log(favorite)

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		if (empire.favorites && empire.favorites.includes(favorite)) {
			empire.favorites = empire.favorites.filter((f) => f !== favorite)
		} else {
			if (empire.favorites === null) empire.favorites = []
			empire.favorites.push(favorite)
		}

		await empire.save()
		console.log('favorite updated')
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const router = Router()

router.post('/', user, auth, createEmpire)

router.get('/', getEmpires)
router.get('/scores', getScores)
router.get('/:uuid', user, auth, findOneEmpire)
router.post('/effects', user, auth, getEmpireEffects)
router.post('/effects/new', user, auth, addEmpireEffect)
// router.put('/:uuid', user, auth, updateEmpire)
router.post('/:uuid/bank', user, auth, bank)
router.post('/:uuid/tax', user, auth, updateTax)
router.post('/:uuid/industry', user, auth, updateIndustry)
router.post('/otherEmpires', user, auth, getOtherEmpires)
router.post('/:uuid/favorite', user, auth, updateEmpireFavorite)

// router.put('/give/resources', giveResources)
// router.put('/give/turns', giveTurns)

router.delete('/:uuid', deleteEmpire)

export default router
