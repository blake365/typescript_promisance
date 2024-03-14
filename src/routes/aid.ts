import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { useTurnInternal } from './useturns'
import Clan from '../entity/Clan'
import { eraArray } from '../config/eras'
import { createNewsEvent } from '../util/helpers'
import { getNetworth } from './actions/actions'
import { takeSnapshot } from './actions/snaps'
import { updateEmpire } from './actions/updateEmpire'
import { attachGame } from '../middleware/game'

// send aid to another empire
const sendAid = async (req: Request, res: Response) => {
	const {
		empireId,
		receiverId,
		cash,
		food,
		runes,
		trpArm,
		trpLnd,
		trpSea,
		trpFly,
		type,
	} = req.body
	const game = res.locals.game

	if (type !== 'aid') {
		return res.status(400).json({ error: 'something went wrong' })
	}

	let items = ['cash', 'food', 'runes', 'trpArm', 'trpLnd', 'trpFly', 'trpSea']
	let sentItems = items
		.map((item) => {
			return {
				name: item,
				value: req.body[item],
			}
		})
		.filter((item) => item.value > 0)

	// console.log(sentItems)

	const turns = 2
	let resultArray = []

	try {
		const sender = await Empire.findOneOrFail({ id: empireId })
		const receiver = await Empire.findOneOrFail({ id: receiverId })

		if (sender.game_id !== receiver.game_id) {
			return res.status(400).json({ error: 'Unauthorized' })
		}

		let shipsNeeded = Math.round(sender.trpSea * 0.02)
		if (shipsNeeded < 10000) {
			shipsNeeded = 10000
		}

		if (sender.trpSea < shipsNeeded) {
			return res.status(400).json({ error: 'Not enough ships' })
		}

		if (sender.id === receiver.id) {
			return res.status(400).json({ error: 'cannot send aid to yourself' })
		}

		if (sender.aidCredits < 1) {
			return res
				.status(400)
				.json({ error: "You don't have enough aid credits" })
		}

		if (sender.mode === 'demo' || receiver.mode === 'demo') {
			return res
				.status(400)
				.json({ error: 'Cannot send or receive aid as a demo empire' })
		}

		if (
			sender.turnsUsed < game.turnsProtection ||
			receiver.turnsUsed < game.turnsProtection
		) {
			return res
				.status(400)
				.json({ error: 'Cannot send or receive aid while in protection' })
		}

		let clan = null
		if (sender.clanId !== 0) {
			clan = await Clan.findOneOrFail({
				where: { id: sender.clanId },
				relations: ['relation'],
			})

			console.log(clan.relation)
			let relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === 'war') {
					return relation.c_id2
				}
			})
			// check if clan is at war
			if (relations.includes(receiver.clanId)) {
				console.log('clan is at war')
				// clan is at war with receiver
				return res
					.status(400)
					.json({ error: 'Cannot send aid to a clan you are at war with' })
			}
		}

		if (
			receiver.networth > sender.networth * 2 &&
			receiver.clanId !== sender.clanId
		) {
			return res
				.status(400)
				.json({ error: 'Cannot send aid to such a large empire' })
		}

		let aidTurns = useTurnInternal('aid', turns, sender, clan, true, game)
		let spellRes = aidTurns[0]
		// console.log('spell res', spellRes)
		aidTurns = aidTurns[0]
		if (!spellRes?.messages?.desertion) {
			// remove items from sender
			sender.cash -= cash
			sender.food -= food
			sender.runes -= runes
			sender.trpArm -= trpArm
			sender.trpLnd -= trpLnd
			sender.trpSea -= trpSea
			sender.trpFly -= trpFly
			sender.aidCredits -= 1
			sender.trpSea -= shipsNeeded

			// add items to receiver
			receiver.cash += cash
			receiver.food += food
			receiver.runes += runes
			receiver.trpArm += trpArm
			receiver.trpLnd += trpLnd
			receiver.trpSea += trpSea
			receiver.trpFly += trpFly
			receiver.trpSea += shipsNeeded

			receiver.networth = getNetworth(receiver, game)

			if (receiver.peakCash < receiver.cash + receiver.bank) {
				receiver.peakCash = receiver.cash + receiver.bank
			}
			if (receiver.peakFood < receiver.food) {
				receiver.peakFood = receiver.food
			}
			if (receiver.peakRunes < receiver.runes) {
				receiver.peakRunes = receiver.runes
			}
			if (receiver.peakNetworth < receiver.networth) {
				receiver.peakNetworth = receiver.networth
			}
			if (receiver.peakTrpArm < receiver.trpArm) {
				receiver.peakTrpArm = receiver.trpArm
			}
			if (receiver.peakTrpLnd < receiver.trpLnd) {
				receiver.peakTrpLnd = receiver.trpLnd
			}
			if (receiver.peakTrpFly < receiver.trpFly) {
				receiver.peakTrpFly = receiver.trpFly
			}
			if (receiver.peakTrpSea < receiver.trpSea) {
				receiver.peakTrpSea = receiver.trpSea
			}

			await receiver.save()
			await takeSnapshot(receiver)

			aidTurns['aid'] = 'Shipment sent successfully'

			let pubContent = `${sender.name} sent aid to ${receiver.name}`

			let sentString = sentItems.map((item) => {
				if (item.name === 'cash') {
					return `$${item.value.toLocaleString()}`
				}
				return `${item.value.toLocaleString()} ${
					eraArray[receiver.era][item.name.toLowerCase()]
				}`
			})

			let content = `${sender.name} sent you ${sentString.join(', ')}.`

			// console.log('content', content)
			await createNewsEvent(
				content,
				pubContent,
				sender.id,
				sender.name,
				receiver.id,
				receiver.name,
				'aid',
				'success',
				sender.game_id
			)
		} else {
			aidTurns['aid'] = 'Due to chaos and desertion, your shipment was not sent'
		}

		await updateEmpire(sender, aidTurns, turns, game)

		resultArray.push(aidTurns)

		// await awardAchievements(sender)
		await takeSnapshot(sender)
	} catch (err) {
		return res.status(400).json({ error: 'something went wrong' })
	}

	// console.log('result array', resultArray)
	return res.json(resultArray)
	// createNewsEvent()
}

const router = Router()

router.post('/', user, auth, attachGame, sendAid)

export default router
