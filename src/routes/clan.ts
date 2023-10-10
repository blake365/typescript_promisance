import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'
import EmpireEffect from '../entity/EmpireEffect'
import Clan from '../entity/Clan'
import { TURNS_PROTECTION } from '../config/conifg'
import bcrypt from 'bcrypt'

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
			],
			where: { clanId },
			order: { networth: 'DESC' },
		})

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

export default router
