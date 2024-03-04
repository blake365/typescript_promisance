import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'
import EmpireEffect from '../entity/EmpireEffect'
import Clan from '../entity/Clan'
import bcrypt from 'bcrypt'
import { createNewsEvent } from '../util/helpers'
import ClanRelation from '../entity/ClanRelation'
import User from '../entity/User'
import { containsOnlySymbols } from './actions/actions'
import { attachGame } from '../middleware/game'
import Game from '../entity/Game'

const Filter = require('bad-words')
const filter = new Filter()

const createClan = async (req: Request, res: Response) => {
	let { clanName, clanPassword, empireId } = req.body

	const game: Game = res.locals.game
	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	// console.log(clanName, clanPassword, empireId)
	if (!containsOnlySymbols(clanName)) {
		clanName = filter.clean(clanName)
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})
		if (empire.clanId !== 0) {
			return res.status(400).json({ error: 'You are already in a clan' })
		}

		if (empire.turnsUsed < game.turnsProtection) {
			return res.status(400).json({
				error: 'You cannot create a clan while under new player protection',
			})
		}

		const existingClan = await Clan.findOne({
			where: { clanName: clanName },
		})
		if (existingClan) {
			return res.status(400).json({ error: 'Clan name already exists' })
		}

		const clanMembers = 1
		const empireIdLeader = empireId
		const game_id = game.game_id
		let newClan: Clan = null
		newClan = new Clan({
			clanName,
			clanPassword,
			clanMembers,
			empireIdLeader,
			game_id,
		})

		await newClan.save()

		empire.clanId = newClan.id
		await empire.save()

		// create effect
		let empireEffectName = 'join clan'
		let empireEffectValue = game.clanMinJoin * 60
		let effectOwnerId = empire.id

		let newEffect: EmpireEffect
		newEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await newEffect.save()

		return res.json(empire)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when creating clan' })
	}
}

const joinClan = async (req: Request, res: Response) => {
	let { clanName, clanPassword, empireId } = req.body

	const game: Game = res.locals.game
	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: 'leave clan' },
			order: { createdAt: 'DESC' },
		})

		let now = new Date()
		let timeLeft = 0

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
			timeLeft = effect.empireEffectValue - effectAge
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge)
		}

		if (timeLeft > 0) {
			return res
				.status(400)
				.json({ error: 'You cannot join a clan for 3 days after leaving one' })
		}

		if (empire.turnsUsed < game.turnsProtection) {
			return res.status(400).json({
				error: 'You cannot join a clan while under new player protection',
			})
		}

		if (empire.clanId !== 0) {
			return res.status(400).json({ error: 'You are already in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { clanName },
		})

		const passwordMatches = await bcrypt.compare(
			clanPassword,
			clan.clanPassword
		)

		if (!passwordMatches) {
			return res.status(401).json({ password: 'Password is incorrect' })
		}

		if (clan.clanMembers >= game.clanSize) {
			return res.status(400).json({ error: 'Clan is full' })
		}

		clan.clanMembers++
		await clan.save()

		empire.clanId = clan.id
		await empire.save()

		// create effect
		let empireEffectName = 'join clan'
		let empireEffectValue = game.clanMinJoin * 60
		let effectOwnerId = empire.id

		let newEffect: EmpireEffect
		newEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await newEffect.save()

		return res.json(empire)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when joining clan' })
	}
}

const leaveClan = async (req: Request, res: Response) => {
	let { empireId } = req.body

	const game: Game = res.locals.game
	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: 'join clan' },
			order: { createdAt: 'DESC' },
		})

		let now = new Date()
		let timeLeft = 0

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
			timeLeft = effect.empireEffectValue - effectAge
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge)
		}

		if (timeLeft > 0) {
			return res.status(400).json({
				error: `You cannot leave a clan for ${game.clanMinJoin} hours after joining`,
			})
		}

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		})

		if (clan.empireIdLeader === empire.id) {
			return res.status(400).json({ error: 'Clan leader cannot leave' })
		}

		clan.clanMembers--
		await clan.save()

		empire.clanId = 0
		await empire.save()

		// create effect
		let empireEffectName = 'leave clan'
		let empireEffectValue = game.clanMinRejoin * 60
		let effectOwnerId = empire.id

		let newEffect: EmpireEffect
		newEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await newEffect.save()

		return res.json(empire)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when leaving clan' })
	}
}

const disbandClan = async (req: Request, res: Response) => {
	let { empireId, clanId } = req.body

	const game: Game = res.locals.game
	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: 'join clan' },
			order: { createdAt: 'DESC' },
		})

		let now = new Date()
		let timeLeft = 0

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
			timeLeft = effect.empireEffectValue - effectAge
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge)
		}

		if (timeLeft > 0) {
			return res.status(400).json({
				error: `You cannot disband a clan for ${game.clanMinJoin} hours after creating it`,
			})
		}

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		})

		if (clan.empireIdLeader !== empire.id) {
			return res
				.status(400)
				.json({ error: 'You do not have authority to disband the clan' })
		}

		const members = await Empire.find({
			where: { clanId: clanId },
		})

		await clan.remove()

		members.forEach(async (member) => {
			member.clanId = 0
			await member.save()
		})

		// create effect
		let empireEffectName = 'leave clan'
		let empireEffectValue = game.clanMinRejoin * 60
		let effectOwnerId = empire.id

		let newEffect: EmpireEffect
		newEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await newEffect.save()

		return res.json(empire)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when leaving clan' })
	}
}

const kickFromClan = async (req: Request, res: Response) => {
	let { empireId } = req.body

	const game: Game = res.locals.game
	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		})

		if (clan.empireIdLeader === empire.id) {
			return res.status(400).json({ error: 'Clan leader cannot be kicked out' })
		}

		if (clan.empireIdAssistant === empire.id) {
			clan.empireIdAssistant = 0
		}

		clan.clanMembers--
		await clan.save()

		empire.clanId = 0
		await empire.save()

		// create effect
		let empireEffectName = 'leave clan'
		let empireEffectValue = game.clanMinRejoin * 60
		let effectOwnerId = empire.id

		let newEffect: EmpireEffect
		newEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await newEffect.save()

		let pubContent = `${empire.name} has been kicked out of ${clan.clanName}!`
		let content = `You have been kicked out of ${clan.clanName}!`

		await createNewsEvent(
			content,
			pubContent,
			clan.empireIdLeader,
			clan.clanName,
			empire.id,
			empire.name,
			'clan',
			'fail',
			empire.game_id
		)

		return res.json(empire)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when leaving clan' })
	}
}

const getClan = async (req: Request, res: Response) => {
	let { clanId } = req.body

	try {
		const clan = await Clan.find({
			select: [
				'id',
				'clanName',
				'clanTitle',
				'clanMembers',
				'clanPic',
				'empireIdLeader',
				'empireIdAssistant',
				'empireIdAgent1',
				'empireIdAgent2',
				'enemies',
				'peaceOffer',
			],
			where: { id: clanId },
			relations: ['relation'],
		})

		// console.log(clan)
		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when getting clan' })
	}
}

const getClanMembers = async (req: Request, res: Response) => {
	let { clanId } = req.body
	// console.log(req.body)
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
				'tax',
				'health',
				'trpArm',
				'trpLnd',
				'trpFly',
				'trpSea',
				'trpWiz',
				'runes',
				'food',
				'cash',
				'peasants',
				'turns',
				'storedturns',
				'diminishingReturns',
			],
			where: { clanId },
			order: { networth: 'DESC' },
		})

		// console.log(empires)
		return res.json(empires)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when getting clan members' })
	}
}

const getClans = async (req: Request, res: Response) => {
	const { gameId } = req.query

	try {
		const clans = await Clan.find({
			select: ['id', 'clanName', 'clanTitle', 'clanMembers', 'clanPic'],
			where: { clanMembers: Not(0), game_id: gameId },
		})

		if (clans.length === 0) {
			return res.status(400).json({ error: 'No clans found' })
		} else {
			return res.json(clans)
		}
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when getting clans' })
	}
}

const getClansData = async (req: Request, res: Response) => {
	const { gameId } = req.query

	try {
		const clans = await Clan.find({
			select: [
				'id',
				'clanName',
				'clanTitle',
				'clanMembers',
				'clanPic',
				'empireIdLeader',
				'empireIdAssistant',
				'empireIdAgent1',
				'empireIdAgent2',
				'enemies',
				'peaceOffer',
			],
			where: { clanMembers: Not(0), game_id: gameId },
			relations: ['relation'],
		})

		if (clans.length === 0) {
			return res.status(400).json({ error: 'No clans found' })
		} else {
			const clanNetworths = await Promise.all(
				clans.map(async (clan) => {
					let avgNetworth = 0
					let totalNetworth = 0
					let leader = { name: '', id: 0 }
					const empires = await Empire.find({
						where: { clanId: clan.id },
					})

					empires.forEach((empire) => {
						totalNetworth += empire.networth
						leader = { name: empire.name, id: empire.id }
					})

					avgNetworth = totalNetworth / clan.clanMembers

					return { clan, avgNetworth, totalNetworth, leader }
				})
			)

			return res.json(clanNetworths)
		}
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when getting clans' })
	}
}

// assign empire to clan role
const assignClanRole = async (req: Request, res: Response) => {
	let { empireId, clanRole, memberId } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const member = await Empire.findOneOrFail({
			where: { id: memberId },
		})

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		})

		if (clan.empireIdLeader !== empire.id) {
			return res.status(400).json({ error: 'You are not the clan leader' })
		}

		if (clan.empireIdAssistant !== 0) {
			return res.status(400).json({ error: 'Assistant already assigned' })
		}

		if (clanRole === 'leader') {
			clan.empireIdLeader = member.id
		} else if (clanRole === 'assistant') {
			clan.empireIdAssistant = member.id
		} else if (clanRole === 'agent1') {
			clan.empireIdAgent1 = member.id
		} else if (clanRole === 'agent2') {
			clan.empireIdAgent2 = member.id
		} else {
			return res.status(400).json({ error: 'Invalid role' })
		}

		await clan.save()

		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when assigning clan role' })
	}
}

// remove empire from clan role
const removeClanRole = async (req: Request, res: Response) => {
	let { empireId, clanRole } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})
		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		})

		if (clan.empireIdLeader !== empire.id) {
			return res.status(400).json({ error: 'You are not the clan leader' })
		}

		if (clanRole === 'leader') {
			clan.empireIdLeader = 0
		} else if (clanRole === 'assistant') {
			clan.empireIdAssistant = 0
		} else if (clanRole === 'agent1') {
			clan.empireIdAgent1 = 0
		} else if (clanRole === 'agent2') {
			clan.empireIdAgent2 = 0
		} else {
			return res.status(400).json({ error: 'Invalid role' })
		}

		await clan.save()

		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when removing clan role' })
	}
}

const declareWar = async (req: Request, res: Response) => {
	let { empireId, clanId, enemyClanId } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	// console.log(req.body)
	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ['relation'],
		})

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
			relations: ['relation'],
		})

		const enemyLeader = await Empire.findOneOrFail({
			where: { id: enemyClan.empireIdLeader },
		})

		if (
			clan.empireIdLeader !== empire.id &&
			clan.empireIdAssistant !== empire.id
		) {
			return res
				.status(400)
				.json({ error: 'You are not in a position of power' })
		}

		// console.log(clan.relation)

		let relations = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'war') {
				return relation.c_id2
			}
		})

		// console.log(enemyClan.relation)

		let enemyRelations = enemyClan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'war') {
				return relation.c_id2
			}
		})

		if (relations.includes(enemyClanId) || enemyRelations.includes(clanId)) {
			return res.status(400).json({ error: 'Clan is already at war' })
		} else {
			let myClanRelation = new ClanRelation({
				c_id1: clanId,
				clan1Name: clan.clanName,
				c_id2: enemyClanId,
				clan2Name: enemyClan.clanName,
				clanRelationFlags: 'war',
				clan: clan,
			})

			let enemyClanRelation = new ClanRelation({
				c_id1: enemyClanId,
				clan1Name: enemyClan.clanName,
				c_id2: clanId,
				clan2Name: clan.clanName,
				clanRelationFlags: 'war',
				clan: enemyClan,
			})

			await myClanRelation.save()
			await enemyClanRelation.save()
		}

		let pubContent = `${clan.clanName} has declared war on ${enemyClan.clanName}!`
		let content = `${clan.clanName} has declared war on you!`

		await createNewsEvent(
			content,
			pubContent,
			empireId,
			empire.name,
			enemyClan.empireIdLeader,
			enemyLeader.name,
			'war',
			'success',
			empire.game_id
		)

		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when declaring war' })
	}
}

const offerPeace = async (req: Request, res: Response) => {
	const { empireId, clanId, enemyClanId } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(400).json({ error: 'unauthorized' })
	}

	// console.log(req.body)

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})

		if (empire.clanId === 0) {
			return res.status(400).json({ error: 'You are not in a clan' })
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ['relation'],
		})

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
			relations: ['relation'],
		})

		const enemyLeader = await Empire.findOneOrFail({
			where: { id: enemyClan.empireIdLeader },
		})

		if (
			clan.empireIdLeader !== empire.id &&
			clan.empireIdAssistant !== empire.id
		) {
			return res
				.status(400)
				.json({ error: 'You are not in a position of power' })
		}

		// check if you are at war
		// check if you have already offered peace
		// check if enemy has already offered peace
		let myWarRelation = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'war') {
				return relation.c_id2
			}
		})

		let myPeaceOffer = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'peace') {
				return relation.c_id2
			}
		})

		let enemyPeaceOffer = enemyClan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'peace') {
				return relation.c_id2
			}
		})

		if (!myWarRelation.includes(enemyClanId)) {
			return res.status(400).json({ error: 'Clan is not an enemy' })
		}

		if (myPeaceOffer.includes(enemyClanId)) {
			// already offered peace
			return res
				.status(400)
				.json({ error: 'You have already offered peace to this clan' })
		}

		console.log(enemyPeaceOffer)
		console.log(myPeaceOffer)
		console.log(myWarRelation)

		if (enemyPeaceOffer.includes(clanId)) {
			// peace has been offered by other clan, you are accepting peace, remove from enemies
			clan.relation.forEach(async (relation) => {
				if (
					relation.c_id2 === enemyClanId &&
					relation.clanRelationFlags === 'war'
				) {
					await relation.remove()
				}
			})

			enemyClan.relation.forEach(async (relation) => {
				if (relation.c_id2 === clanId && relation.clanRelationFlags === 'war') {
					await relation.remove()
				} else if (
					relation.c_id2 === clanId &&
					relation.clanRelationFlags === 'peace'
				) {
					await relation.remove()
				}
			})
			// peace news event
			let content = `${clan.clanName} has accepted the peace offering to end the war!`
			let pubContent = `${clan.clanName} has accepted the peace offering to end the war with ${enemyClan.clanName}!`

			await createNewsEvent(
				content,
				pubContent,
				empireId,
				empire.name,
				enemyClan.empireIdLeader,
				enemyLeader.name,
				'peace',
				'success',
				empire.game_id
			)
		} else if (myWarRelation.includes(enemyClanId)) {
			// you are at war and have not offered peace yet, first offer
			let myClanRelation = new ClanRelation({
				c_id1: clanId,
				clan1Name: clan.clanName,
				c_id2: enemyClanId,
				clan2Name: enemyClan.clanName,
				clanRelationFlags: 'peace',
				clan: clan,
			})

			await myClanRelation.save()
			// peace is offered by one side
			let content = `${clan.clanName} has offered peace to end the war!`
			let pubContent = `${clan.clanName} has offered peace to end the war with ${enemyClan.clanName}!`
			await createNewsEvent(
				content,
				pubContent,
				empireId,
				empire.name,
				enemyClan.empireIdLeader,
				enemyLeader.name,
				'peace',
				'shielded',
				empire.game_id
			)
		}

		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when declaring peace' })
	}
}

const router = Router()

router.post('/create', user, auth, attachGame, createClan)
router.post('/join', user, auth, attachGame, joinClan)
router.post('/leave', user, auth, attachGame, leaveClan)
router.post('/disband', user, auth, attachGame, disbandClan)
router.post('/kick', user, auth, attachGame, kickFromClan)
router.post('/get', user, auth, getClan)
router.post('/getMembers', user, auth, getClanMembers)
router.get('/getClans', getClans)
router.get('/getClansData', getClansData)
router.post('/assignRole', user, auth, assignClanRole)
router.post('/removeRole', user, auth, removeClanRole)
router.post('/declareWar', user, auth, declareWar)
router.post('/offerPeace', user, auth, offerPeace)

export default router
