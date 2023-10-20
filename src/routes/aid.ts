import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { useTurnInternal } from './useturns'
import Clan from '../entity/Clan'

import { eraArray } from '../config/eras'
import { createNewsEvent } from '../util/helpers'
import {
	TURNS_PROTECTION,
	PVTM_TRPARM,
	PVTM_TRPLND,
	PVTM_TRPFLY,
	PVTM_TRPSEA,
} from '../config/conifg'
import { getNetworth } from './actions/actions'

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

	console.log(sentItems)

	const turns = 2
	let resultArray = []

	try {
		const sender = await Empire.findOneOrFail({ id: empireId })
		const receiver = await Empire.findOneOrFail({ id: receiverId })

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
			sender.turnsUsed < TURNS_PROTECTION ||
			receiver.turnsUsed < TURNS_PROTECTION
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
		}

		let aidTurns = useTurnInternal('aid', turns, sender, clan, true)
		let spellRes = aidTurns[0]
		console.log('spell res', spellRes)
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

			receiver.networth = getNetworth(receiver)

			await receiver.save()

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

			console.log('content', content)
			await createNewsEvent(
				content,
				pubContent,
				sender.id,
				sender.name,
				receiver.id,
				receiver.name,
				'aid',
				'success'
			)
		} else {
			aidTurns['aid'] = 'Due to chaos and desertion, your shipment was not sent'
		}

		resultArray.push(aidTurns)

		sender.cash =
			sender.cash + spellRes.withdraw + spellRes.money - spellRes.loanpayed

		if (sender.cash < 0) {
			sender.cash = 0
		}

		sender.income += spellRes.income
		sender.expenses += spellRes.expenses + spellRes.wartax

		sender.loan -= spellRes.loanpayed + spellRes.loanInterest
		sender.trpArm += spellRes.trpArm
		sender.trpLnd += spellRes.trpLnd
		sender.trpFly += spellRes.trpFly
		sender.trpSea += spellRes.trpSea

		sender.indyProd +=
			spellRes.trpArm * PVTM_TRPARM +
			spellRes.trpLnd * PVTM_TRPLND +
			spellRes.trpFly * PVTM_TRPFLY +
			spellRes.trpSea * PVTM_TRPSEA

		sender.food += spellRes.food

		sender.foodpro += spellRes.foodpro
		sender.foodcon += spellRes.foodcon

		if (sender.food < 0) {
			sender.food = 0
		}
		sender.peasants += spellRes.peasants
		sender.runes += spellRes.runes
		sender.trpWiz += spellRes.trpWiz
		sender.turns -= turns
		sender.turnsUsed += turns
		sender.lastAction = new Date()

		sender.networth = getNetworth(sender)

		await sender.save()
	} catch (err) {
		return res.status(400).json({ error: 'something went wrong' })
	}

	console.log('result array', resultArray)
	return res.json(resultArray)
	// createNewsEvent()
}

const router = Router()

router.post('/', user, auth, sendAid)

export default router
