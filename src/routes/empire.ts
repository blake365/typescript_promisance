import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { getNetworth } from './actions/actions'


//CREATE
const createEmpire = async (req: Request, res: Response) => {
	let { name, race } = req.body

	const user: User = res.locals.user

	let mode = 'normal'
	let turns: number = 250

	if (user.role === 'demo') {
		mode = 'demo'
		turns = 2000
	}

	if (name.trim() === '') {
		return res.status(400).json({ name: 'Name must not be empty' })
	}

	try {
		const empire = new Empire({ name, race, user, mode, turns })
		await empire.save()
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'Something went wrong' })
	}
}


// set some starting resources to work with
// const giveResources = async (_: Request, res: Response) => {
// 	try {
// 		const empires = await Empire.find()

// 		empires.forEach(async (empire) => {
// 			empire.bldCash = 2000
// 			empire.bldCost = 2000
// 			empire.bldFood = 2000
// 			empire.bldPop = 2000
// 			empire.bldTroop = 2000
// 			empire.bldWiz = 2000
// 			empire.cash = 1000000
// 			empire.era = 1
// 			empire.food = 50000
// 			empire.freeLand = 2000
// 			empire.land = 14000
// 			empire.health = 100
// 			empire.indArmy = 25
// 			empire.indFly = 25
// 			empire.indLnd = 25
// 			empire.indSea = 25
// 			empire.trpArm = 500
// 			empire.trpFly = 500
// 			empire.trpLnd = 500
// 			empire.trpSea = 500
// 			empire.peasants = 20000
// 			empire.runes = 1000
// 			empire.turns = 1000
// 			empire.tax = 10

// 			await empire.save()
// 		})

// 		return res.json(empires)
// 	} catch (error) {
// 		console.log(error)
// 		return res.status(500).json(error)
// 	}
// }

// set some turns resources to work with
// const giveTurns = async (_: Request, res: Response) => {
// 	try {
// 		const empires = await Empire.find()

// 		empires.forEach(async (empire) => {
// 			empire.turns = 1000

// 			await empire.save()
// 		})

// 		return res.json(empires)
// 	} catch (error) {
// 		console.log(error)
// 		return res.status(500).json(error)
// 	}
// }

// READ
const getEmpires = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find()

		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// UPDATE

// TODO: rework how taxes and industry are updated
// TODO: set up framework for how other empire settings are updated
const updateEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { tax, indArmy, indFly, indLnd, indSea } = req.body

	if (indArmy !== null && indArmy + indFly + indLnd + indSea !== 100) {
		return res.status(500).json({ error: 'percentages must add up to 100' })
	}

	console.log(req.body)

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		empire.tax = tax || empire.tax
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
		// empire.indArmy = indArmy || empire.indArmy
		// empire.indLnd = indLnd || empire.indLnd
		// empire.indFly = indFly || empire.indFly
		// empire.indSea = indSea || empire.indSea

		await empire.save()
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// Bank
const bank = async (req:Request, res: Response) => {
	const { uuid } = req.params
	let { depositAmt, withdrawAmt, type, loanAmt, repayAmt } = req.body

	console.log(req.body)

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		// const size = calcSizeBonus(empire)

		const maxLoan = empire.networth * 50
		const maxSavings = empire.networth * 100
		
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
				depositResult = {action: 'deposit', amount: depositAmt}

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
		const empire = await Empire.findOneOrFail({ uuid }, {relations: ['user']})
		// console.log('empire', empire)
		// console.log('user', user)
		if (user.username !== empire.user.username) {
			return res.status(403).json({error: 'unauthorized'})
		}

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const router = Router()

router.post('/', user, auth, createEmpire)

router.get('/', getEmpires)
router.get('/:uuid', user, auth, findOneEmpire)
router.put('/:uuid', user, auth, updateEmpire)
router.post('/:uuid/bank', user, auth, bank)

// router.put('/give/resources', giveResources)
// router.put('/give/turns', giveTurns)

router.delete('/:uuid', deleteEmpire)

export default router
