import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'
import EmpireEffect from '../entity/EmpireEffect'
import Clan from '../entity/Clan'
import { TURNS_PROTECTION } from '../config/conifg'
import bcrypt from 'bcrypt'
import { createNewsEvent } from '../util/helpers'

const Filter = require('bad-words')

const createClan = async (req: Request, res: Response) => {
	let { clanName, clanPassword, empireId } = req.body
	const filter = new Filter()

	// console.log(clanName, clanPassword, empireId)
	clanName = filter.clean(clanName)

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		})
		if (empire.clanId !== 0) {
			return res.status(400).json({ error: 'You are already in a clan' })
		}

		if (empire.turnsUsed < TURNS_PROTECTION) {
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
		let newClan: Clan = null
		newClan = new Clan({
			clanName,
			clanPassword,
			clanMembers,
			empireIdLeader,
		})

		await newClan.save()

		empire.clanId = newClan.id
		await empire.save()

		// create effect
		let empireEffectName = 'join clan'
		let empireEffectValue = 3 * 60 * 24
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

		if (empire.turnsUsed < TURNS_PROTECTION) {
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

		if (clan.clanMembers >= 5) {
			return res.status(400).json({ error: 'Clan is full' })
		}

		clan.clanMembers++
		await clan.save()

		empire.clanId = clan.id
		await empire.save()

		// create effect
		let empireEffectName = 'join clan'
		let empireEffectValue = 3 * 60 * 24
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
			return res
				.status(400)
				.json({ error: 'You cannot leave a clan for 3 days after joining' })
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
		let empireEffectValue = 3 * 60 * 24
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

const getClan = async (req: Request, res: Response) => {
	let { clanId } = req.body

	try {
		const clan = await Clan.findOneOrFail({
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
	try {
		const clans = await Clan.find({
			select: ['id', 'clanName', 'clanTitle', 'clanMembers', 'clanPic'],
			where: { clanMembers: Not(0) },
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
			where: { clanMembers: Not(0) },
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
	let { empireId, clanRole } = req.body

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
			clan.empireIdLeader = empire.id
		} else if (clanRole === 'assistant') {
			clan.empireIdAssistant = empire.id
		} else if (clanRole === 'agent1') {
			clan.empireIdAgent1 = empire.id
		} else if (clanRole === 'agent2') {
			clan.empireIdAgent2 = empire.id
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

	console.log(req.body)
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

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
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

		let enemies = []
		if (clan.enemies) {
			enemies = clan.enemies.toString().split(',')
		}

		console.log(enemies)
		if (enemies.includes(enemyClanId.toString())) {
			return res.status(400).json({ error: 'Clan is already an enemy' })
		}

		if (clan.enemies === null) {
			clan.enemies = [enemyClanId]
		} else {
			clan.enemies.push(enemyClanId)
		}

		if (enemyClan.enemies === null) {
			enemyClan.enemies = [clanId]
		} else {
			enemyClan.enemies.push(clanId)
		}

		await enemyClan.save()
		await clan.save()

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
			'success'
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

	console.log(req.body)

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

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
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

		// rework enemy and offer checking
		let enemies = []
		let peaceOffer = []
		let enemyPeaceOffer = []
		let enemyEnemies = []

		if (clan.enemies) {
			enemies = clan.enemies.toString().split(',')
		}

		if (clan.peaceOffer) {
			peaceOffer = clan.peaceOffer.toString().split(',')
		}

		if (enemyClan.peaceOffer) {
			enemyPeaceOffer = enemyClan.peaceOffer.toString().split(',')
		}

		if (enemyClan.enemies) {
			enemyEnemies = enemyClan.enemies.toString().split(',')
		}

		console.log(enemies)
		console.log(peaceOffer)
		console.log(enemyPeaceOffer)
		console.log(enemyEnemies)
		// console.log(enemies.includes(clan.id.toString()))

		if (enemies.includes(clan.id.toString())) {
			return res.status(400).json({ error: 'Clan is not an enemy' })
		}

		if (peaceOffer.includes(enemyClanId.toString())) {
			// already offered peace
			return res
				.status(400)
				.json({ error: 'You have already offered peace to this clan' })
		}

		if (enemyPeaceOffer.includes(clanId.toString())) {
			// peace has been offered by other clan, you are accepting peace, remove from enemies
			enemyClan.enemies = enemyEnemies.filter((id) => id !== clanId)
			clan.enemies = enemies.filter((id) => id !== enemyClanId)
			enemyClan.peaceOffer = enemyPeaceOffer.filter((id) => id !== clanId)
			clan.peaceOffer = peaceOffer.filter((id) => id !== enemyClanId)
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
				'success'
			)
		}

		if (peaceOffer.includes(enemyClanId.toString())) {
			// you have already offered peace
			return res.status(400).json({
				error: `You have already offered peace to ${enemyClan.clanName}`,
			})
		}

		if (
			enemies.includes(enemyClanId.toString()) &&
			!peaceOffer.includes(enemyClanId.toString())
		) {
			// you are at war and have not offered peace yet, first offer
			clan.peaceOffer.push(enemyClanId)
			enemyClan.peaceOffer.push(clanId)
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
				'shielded'
			)
		}

		await enemyClan.save()
		await clan.save()

		return res.json(clan)
	} catch (err) {
		console.log(err)
		return res
			.status(500)
			.json({ error: 'Something went wrong when declaring peace' })
	}
}

const router = Router()

router.post('/create', user, auth, createClan)
router.post('/join', user, auth, joinClan)
router.post('/leave', user, auth, leaveClan)
router.post('/get', user, auth, getClan)
router.post('/getMembers', user, auth, getClanMembers)
router.get('/getClans', getClans)
router.get('/getClansData', getClansData)
router.post('/assignRole', user, auth, assignClanRole)
router.post('/removeRole', user, auth, removeClanRole)
router.post('/declareWar', user, auth, declareWar)
router.post('/offerPeace', user, auth, offerPeace)

export default router
