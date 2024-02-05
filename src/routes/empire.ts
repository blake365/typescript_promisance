import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { containsOnlySymbols, getNetworth } from './actions/actions'
import { Not } from 'typeorm'
import EmpireEffect from '../entity/EmpireEffect'
import {
	EMPIRES_PER_USER,
	MAX_ATTACKS,
	MAX_SPELLS,
	ROUND_START,
	TURNS_COUNT,
	TURNS_DEMO,
	TURNS_FREQ,
	TURNS_INITIAL,
	TURNS_MAXIMUM,
	TURNS_PROTECTION,
	TURNS_STORED,
	ROUND_END,
} from '../config/conifg'
import Clan from '../entity/Clan'
import ClanRelation from '../entity/ClanRelation'
import ClanMessage from '../entity/ClanMessage'
import EmpireMessage from '../entity/EmpireMessage'
import { concatenateIntegers } from './mail'

const Filter = require('bad-words')
const filter = new Filter()

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

	console.log(req.body)
	const user: User = res.locals.user

	let mode = 'normal'
	let turns: number = TURNS_INITIAL
	let storedturns: number = 0
	let mktArm: number = 999999999999
	let mktLnd: number = 999999999999
	let mktFly: number = 999999999999
	let mktSea: number = 999999999999
	let mktFood: number = 999999999999
	let attacks: number = 0
	let spells: number = 0

	// see how many days have passed since round started
	// if more than 1 day, add turns that would have been gained to initial turns
	// if greater than max turns, add to stored turns up to 100 stored turns
	let now = new Date()
	let roundStart = new Date(ROUND_START)
	let diff = now.getTime() - roundStart.getTime()
	let daysRaw = diff / (1000 * 3600 * 24)
	let days = Math.floor(diff / (1000 * 3600 * 24))
	console.log(days)
	let turnsElapsed = ((days * 24 * 60) / TURNS_FREQ) * TURNS_COUNT
	console.log(turnsElapsed)
	let turnsToAdd = turnsElapsed
	if (turnsToAdd > TURNS_MAXIMUM) {
		turns = TURNS_MAXIMUM
		storedturns += turnsToAdd - TURNS_MAXIMUM
		if (storedturns > 100) {
			storedturns = 100
		}
	} else if (turnsToAdd > 0) {
		turns += turnsToAdd
	}

	if (user.empires.length > EMPIRES_PER_USER) {
		return res.status(400).json({ error: 'Max empires per user reached' })
	}

	if (name.trim() === '') {
		return res.status(400).json({ name: 'Name must not be empty' })
	}

	try {
		let empire: Empire = null

		if (!containsOnlySymbols(name)) {
			name = filter.clean(name)
		}

		if (user.role === 'demo') {
			mode = 'demo'
			turns = TURNS_DEMO
			attacks = MAX_ATTACKS - 10
			spells = MAX_SPELLS - 5
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
				attacks,
				spells,
			})
		} else {
			empire = new Empire({ name, race, user, mode, turns, storedturns })
		}

		await empire.save()

		let createdAt = null
		if (now.getTime() - roundStart.getTime() < 0) {
			// round hasn't started yet
			createdAt = roundStart
		} else {
			createdAt = now
		}

		let effectCatchUp = 4320
		if (daysRaw > 0) {
			effectCatchUp = Math.floor(4320 - Math.round(daysRaw * 1440))
		} else if (daysRaw < 0) {
			effectCatchUp = Math.floor(4320 + Math.abs(Math.round(daysRaw * 1440)))
		}

		if (effectCatchUp < 0) {
			effectCatchUp = 0
		}

		let effect: EmpireEffect = null
		effect = new EmpireEffect({
			effectOwnerId: empire.id,
			empireEffectName: 'era delay',
			empireEffectValue: effectCatchUp,
			createdAt: createdAt,
			updatedAt: createdAt,
		})

		effect.save()

		// const messageBody = `Welcome to NeoPromisance. This game is played in month long rounds. This round started on ${ROUND_START.toLocaleString()} and will end on ${ROUND_END.toLocaleString()}. You can find a lot of helpful information in the game guide. If you have any questions, please feel free to ask in the Discord or ask other players in game. Good luck!`

		// // new player intro mail message
		// let message = EmpireMessage.create({
		// 	empireIdSource: 0,
		// 	empireSourceName: 'Welcome',
		// 	empireIdDestination: empire.id,
		// 	empireDestinationName: empire.name,
		// 	messageSubject: '',
		// 	messageBody: messageBody,
		// 	messageTime: 0,
		// 	messageFlags: 0,
		// 	messageIdRef: 0,
		// 	conversationId: concatenateIntegers(0, empire.id),
		// })

		// await message.save()

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
				id: 'DESC',
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
		select: [
			'empireId',
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
			'diminishingReturns',
		],
		where: { empireId: Not(empire_id) },
		order: {
			networth: 'DESC',
		},
		// cache: 1000,
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
				'updatedAt',
				'lastAction',
				'clanId',
				'diminishingReturns',
				'offSucc',
				'offTotal',
				'defSucc',
				'defTotal',
			],
			order: {
				rank: 'ASC',
			},
			// cache: 1000,
		})

		if (empires.length === 0) {
			return res.status(400).json({ error: 'No empires found' })
		} else {
			const newEmpires = await Promise.all(
				empires.map(async (empire) => {
					if (empire.clanId !== 0 && empire.clanId !== null) {
						const clan = await Clan.find({
							select: [
								'id',
								'clanName',
								'clanPic',
								'empireIdLeader',
								'empireIdAssistant',
								'empireIdAgent1',
								'empireIdAgent2',
							],
							where: { id: empire.clanId },
							relations: ['relation'],
						})

						let clanReturn = clan[0]

						return { clanReturn, ...empire }
					} else {
						return empire
					}
				})
			)

			return res.json(newEmpires)
		}

		// return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// UPDATE

const updateTax = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { tax } = req.body

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

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

const updateProfile = async (req: Request, res: Response) => {
	const { empireId, type, profile } = req.body

	console.log(req.body)

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({ id: empireId })

		if (type === 'profile') {
			if (!containsOnlySymbols(profile)) {
				empire.profile = filter.clean(profile)
			} else {
				empire.profile = profile
			}
			await empire.save()
			return res.json(empire)
		}
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

const updateIcon = async (req: Request, res: Response) => {
	const { empireId, type, icon } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({ id: empireId })

		if (type === 'icon') {
			empire.profileIcon = `/icons/${icon}.svg`
			await empire.save()
			return res.json(empire)
		}
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

const updateIndustry = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { indArmy, indFly, indLnd, indSea } = req.body

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	console.log(req.body)
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

// Change Race
const changeRace = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { race } = req.body

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	console.log(race)
	try {
		const empire = await Empire.findOneOrFail({ uuid })

		if (empire.turnsUsed > TURNS_PROTECTION) {
			if (race !== empire.race && empire.turns >= TURNS_MAXIMUM / 2) {
				empire.race = race
				empire.turns -= Math.floor(TURNS_MAXIMUM / 2)
				empire.cash -= Math.floor(empire.cash * 0.25)
				empire.food -= Math.floor(empire.food * 0.25)
				empire.runes -= Math.floor(empire.runes * 0.25)
				empire.peasants -= Math.floor(empire.peasants * 0.1)
				empire.trpArm -= Math.floor(empire.trpArm * 0.1)
				empire.trpLnd -= Math.floor(empire.trpLnd * 0.1)
				empire.trpFly -= Math.floor(empire.trpFly * 0.1)
				empire.trpSea -= Math.floor(empire.trpSea * 0.1)
				empire.networth = getNetworth(empire)
				await empire.save()
			}
		} else {
			empire.race = race
			await empire.save()
		}

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

	// console.log(req.body)
	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		// const size = calcSizeBonus(empire)
		// console.log(empire.id)
		const maxLoan = empire.networth * 50
		let bankCapacity = empire.networth * 100
		let remainingBankCapacity = bankCapacity - empire.bank

		let canSave = remainingBankCapacity
		if (remainingBankCapacity > empire.cash) {
			canSave = empire.cash
		}

		if (repayAmt > empire.loan) {
			repayAmt = empire.loan
		}

		let depositResult = null
		let withdrawResult = null
		let loanResult = null
		let repayResult = null

		if (type === 'savings') {
			if (depositAmt !== 0 && depositAmt <= canSave) {
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

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		if (empire.clanId !== 0) {
			const clan = await Clan.findOne({ id: empire.clanId })
			if (clan.empireIdLeader === empire.id) {
				clan.empireIdLeader = 0
				if (clan.empireIdAssistant) {
					clan.empireIdLeader = clan.empireIdAssistant
					clan.empireIdAssistant = 0
				} else {
					let members = await Empire.find({ clanId: clan.id })
					if (members.length > 1) {
						members = members.filter((member) => member.id !== empire.id)
						members = members.sort((a, b) => b.networth - a.networth)
						clan.empireIdLeader = members[0].id
					}
				}
			} else if (clan.empireIdAssistant === empire.id) {
				clan.empireIdAssistant = 0
			}

			clan.clanMembers -= 1

			if (clan.clanMembers < 1) {
				const relations = await ClanRelation.find({
					where: [{ c_id1: clan.id }, { c_id2: clan.id }],
				})
				if (relations) {
					relations.forEach(async (relation) => {
						await relation.remove()
					})
				}

				const messages = await ClanMessage.find({ clanId: clan.id })
				if (messages) {
					messages.forEach(async (message) => {
						await message.remove()
					})
				}

				await clan.remove()
			} else {
				await clan.save()
			}
		}
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

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail(
			{ uuid },
			{ relations: ['user', 'clan'] }
		)

		if (empire.clanId !== 0 && empire.clanId !== null) {
			const clan = await Clan.find({
				select: [
					'id',
					'clanName',
					'empireIdLeader',
					'empireIdAssistant',
					'empireIdAgent1',
					'empireIdAgent2',
				],
				where: { id: empire.clanId },
				relations: ['relation'],
			})

			if (clan[0]) {
				empire['clan'] = clan[0]
			}

			return res.json(empire)
		}

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const getEmpireEffects = async (req: Request, res: Response) => {
	const { empireId } = req.body

	const user: User = res.locals.user

	if (user?.empires[0]?.id !== empireId) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	// console.log(Date.now().valueOf())

	function isOld(updatedAt, effectValue) {
		let effectAge =
			(Date.now().valueOf() - new Date(updatedAt).getTime()) / 60000
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
			// cache: 3000,
		})
		// console.log('user', user)
		// console.log(effects)

		let filterEffects = effects.filter((effect) =>
			isOld(effect.updatedAt, effect.empireEffectValue)
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

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(403).json({ error: 'unauthorized' })
	}

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

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

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

const bonusTurns = async (req: Request, res: Response) => {
	const { uuid } = req.params

	const { empireId } = req.body

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

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

		const empire = await Empire.findOneOrFail({ uuid })

		let receivedBonus = false
		if (filterEffects.length > 0) {
			filterEffects.forEach((effect) => {
				if (effect.empireEffectName === 'bonus turns') {
					receivedBonus = true
				}
			})
		}
		if (!receivedBonus) {
			empire.turns += 10
			if (empire.turns > TURNS_MAXIMUM) {
				empire.storedturns += empire.turns - TURNS_MAXIMUM
				empire.turns = TURNS_MAXIMUM
				if (empire.storedturns > TURNS_STORED) {
					empire.storedturns = TURNS_STORED
				}
			}

			let effect: EmpireEffect = null
			effect = new EmpireEffect({
				effectOwnerId: empire.id,
				empireEffectName: 'bonus turns',
				empireEffectValue: 1440,
			})

			await effect.save()
		}

		await empire.save()

		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
	}
}

const getAchievements = async (req: Request, res: Response) => {
	const { uuid } = req.params

	// const user: User = res.locals.user

	// if (user.empires[0].uuid !== uuid) {
	// 	return res.status(403).json({ error: 'unauthorized' })
	// }

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		const achievements = empire.achievements

		return res.status(200).json(achievements)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const nameChange = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { name } = req.body

	const user: User = res.locals.user

	if (user.empires[0].uuid !== uuid) {
		return res.status(403).json({ error: 'unauthorized' })
	}

	if (name.trim() === '') {
		return res.status(400).json({ error: 'Name must not be empty' })
	}

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		if (empire.changeName < 1) {
			if (!containsOnlySymbols(name)) {
				empire.name = filter.clean(name)
			} else {
				empire.name = name
			}
			empire.changeName++
			await empire.save()
			return res.status(201).json(empire)
		} else {
			return res.status(400).json({ error: 'Name change already used' })
		}
	} catch (error) {
		console.log(error)
		return res.status(404).json({ error: 'error changing name' })
	}
}

const router = Router()

router.post('/', user, auth, createEmpire)
router.get('/', getEmpires)
router.get('/scores', getScores)
router.get('/:uuid', user, auth, findOneEmpire)
router.get('/:uuid/achievements', getAchievements)
router.post('/effects', user, auth, getEmpireEffects)
router.post('/effects/new', user, auth, addEmpireEffect)
// router.put('/:uuid', user, auth, updateEmpire)
router.post('/:uuid/bank', user, auth, bank)
router.post('/:uuid/tax', user, auth, updateTax)
router.post('/:uuid/industry', user, auth, updateIndustry)
router.post('/otherEmpires', user, auth, getOtherEmpires)
router.post('/:uuid/favorite', user, auth, updateEmpireFavorite)
router.post('/:uuid/profile', user, auth, updateProfile)
router.post('/:uuid/icon', user, auth, updateIcon)
router.post('/:uuid/bonus', user, auth, bonusTurns)
router.post('/:uuid/changeRace', user, auth, changeRace)
router.post('/:uuid/nameChange', user, auth, nameChange)

// router.put('/give/resources', giveResources)
// router.put('/give/turns', giveTurns)

router.delete('/:uuid', user, auth, deleteEmpire)

export default router
