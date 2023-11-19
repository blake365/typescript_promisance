import EmpireMessage from '../entity/EmpireMessage'
import ClanMessage from '../entity/ClanMessage'
import { Router, Request, Response } from 'express'
import user from '../middleware/user'
import auth from '../middleware/auth'
import { Not, Any, getConnection } from 'typeorm'

const Filter = require('bad-words')

const concatenateIntegers = (a, b) => {
	const strA = a.toString()
	const strB = b.toString()

	return parseInt(strA + strB)
}

const getConversations = async (req: Request, res: Response) => {
	const { empireId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== empireId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	try {
		const conversations = await EmpireMessage.find({
			select: [
				'conversationId',
				'empireIdSource',
				'empireSourceName',
				'empireIdDestination',
				'empireDestinationName',
				'createdAt',
			],
			where: [{ empireIdDestination: empireId }, { empireIdSource: empireId }],
			order: { createdAt: 'DESC' },
		})
		// console.log(conversations)

		const filterMessages = (messages) => {
			const conversations = {}

			messages.forEach((message) => {
				const { conversationId, createdAt } = message

				if (
					!conversations[conversationId] ||
					createdAt > conversations[conversationId].createdAt
				) {
					conversations[conversationId] = message
				}
			})

			const filteredMessages = Object.values(conversations)
			return filteredMessages
		}

		const filteredConversations = filterMessages(conversations)
		// console.log(filteredConversations)

		res.status(200).json(filteredConversations)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

const getMessages = async (req: Request, res: Response) => {
	const { conversationId, empireId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== empireId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	try {
		const messages = await EmpireMessage.find({
			where: { conversationId: conversationId },
			order: { createdAt: 'ASC' },
		})

		if (
			messages[0].empireIdDestination !== empireId &&
			messages[0].empireIdSource !== empireId
		) {
			return res.status(401).json({ message: 'Unauthorized' })
		}

		res.status(200).json(messages)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

const postMessage = async (req: Request, res: Response) => {
	let { sourceId, sourceName, destinationId, destinationName, message } =
		req.body

	const { user } = res.locals

	if (user.empires[0].id !== sourceId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	if (!destinationName) {
		let splitter = destinationId.split(',')
		destinationId = splitter[0]
		destinationName = splitter[1]
	}

	if (sourceId === destinationId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	const filter = new Filter()

	message = filter.clean(message)

	// check for existing conversation
	const conversationId1 = concatenateIntegers(sourceId, destinationId)
	const conversationId2 = concatenateIntegers(destinationId, sourceId)
	let conversation1 = null
	let conversation2 = null
	// console.log('conversationId1', conversationId1)
	// console.log('conversationId2', conversationId2)

	conversation1 = await EmpireMessage.find({
		where: { conversationId: conversationId1 },
	})

	// console.log('conversation1', conversation1)

	conversation2 = await EmpireMessage.find({
		where: { conversationId: conversationId2 },
	})

	// console.log('conversation2', conversation2)

	if (conversation1.length < 1 && conversation2.length < 1) {
		console.log('no conversation found')
		const newConversation = EmpireMessage.create({
			empireIdSource: sourceId,
			empireSourceName: sourceName,
			empireIdDestination: destinationId,
			empireDestinationName: destinationName,
			messageSubject: '',
			messageBody: message,
			messageTime: 0,
			messageFlags: 0,
			messageIdRef: 0,
			conversationId: conversationId1,
		})

		await newConversation.save()
		res.status(201).json(newConversation)
	} else if (conversation1.length > 0) {
		console.log('conversation found', conversationId1)
		const newMessage = EmpireMessage.create({
			empireIdSource: sourceId,
			empireSourceName: sourceName,
			empireIdDestination: destinationId,
			empireDestinationName: destinationName,
			messageSubject: '',
			messageBody: message,
			messageTime: 0,
			messageFlags: 0,
			messageIdRef: 0,
			conversationId: conversationId1,
		})

		await newMessage.save()
		res.status(201).json(newMessage)
	} else if (conversation2.length > 0) {
		console.log('conversation found', conversationId2)
		const newMessage = EmpireMessage.create({
			empireIdSource: sourceId,
			empireSourceName: sourceName,
			empireIdDestination: destinationId,
			empireDestinationName: destinationName,
			messageSubject: '',
			messageBody: message,
			messageTime: 0,
			messageFlags: 0,
			messageIdRef: 0,
			conversationId: conversationId2,
		})

		await newMessage.save()
		res.status(201).json(newMessage)
	} else {
		res.status(500).json({ message: 'Error' })
	}
}

const checkForNew = async (req: Request, res: Response) => {
	console.log('checking for new mail')
	const { id } = req.params

	const { user } = res.locals

	if (user.empires[0].id !== id) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	try {
		const news = await EmpireMessage.find({
			where: { empireIdDestination: id },
			order: { createdAt: 'DESC' },
			skip: 0,
			take: 1,
		})

		let check = true
		if (news.length > 0) {
			check = news[0].seen
		}
		return res.json({ new: !check })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countNew = async (req: Request, res: Response) => {
	// console.log('checking for new mail')
	const { id } = req.params

	const { user } = res.locals

	if (user.empires[0].id !== id) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	try {
		const news = await EmpireMessage.findAndCount({
			where: { empireIdDestination: id, seen: false },
			// cache: 30000,
		})

		// console.log(news[news.length - 1])
		return res.json({ count: news[news.length - 1] })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const markRead = async (req: Request, res: Response) => {
	// console.log('marking mail as read')
	const { id } = req.params

	const { user } = res.locals

	if (user.empires[0].id !== id) {
		return res.status(401).json({ message: 'Unauthorized' })
	}

	await getConnection()
		.createQueryBuilder()
		.update(EmpireMessage)
		.set({ seen: true })
		.where({ conversationId: id })
		.execute()

	return res.json({ success: true })
}

const getClanMessages = async (req: Request, res: Response) => {
	const { clanId } = req.body

	try {
		const messages = await ClanMessage.find({
			where: { clanId: clanId },
			order: { createdAt: 'ASC' },
		})

		res.status(200).json(messages)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

const postClanMessage = async (req: Request, res: Response) => {
	const { empireId, empireName, clanMessageBody, clanId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== empireId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}
	// console.log(req.body)
	const filter = new Filter()
	const message = filter.clean(clanMessageBody)

	try {
		const newMessage = ClanMessage.create({
			empireId,
			empireName,
			clanMessageBody: message,
			clanId,
			seenBy: [empireId],
		})

		await newMessage.save()
		res.status(201).json(newMessage)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

const unreadClanMessages = async (req: Request, res: Response) => {
	// count unread messages
	let { empireId, clanId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== empireId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}
	// console.log(req.body)
	empireId = empireId.toString()
	try {
		const messages = await ClanMessage.find({
			where: {
				clanId: clanId,
			},
		})

		let newMessages = 0
		messages.forEach((message) => {
			// console.log(message.seenBy)
			if (!message.seenBy.includes(empireId)) {
				newMessages++
			}
		})

		// console.log(newMessages)
		res.status(200).json(newMessages)
	} catch (error) {
		console.log(error)
		res.status(500).json({ message: error.message })
	}
}

const readClanMessages = async (req: Request, res: Response) => {
	// mark messages as read
	let { empireId, clanId } = req.body

	const { user } = res.locals

	if (user.empires[0].id !== empireId) {
		return res.status(401).json({ message: 'Unauthorized' })
	}
	// console.log(req.body)
	empireId = empireId.toString()
	try {
		const messages = await ClanMessage.find({
			where: {
				clanId: clanId,
			},
			order: { createdAt: 'DESC' },
		})

		// console.log(messages)

		messages.forEach(async (message) => {
			if (!message.seenBy.includes(empireId)) {
				message.seenBy.push(empireId)
				await message.save()
			}
		})

		res.status(200).json({ success: true })
	} catch (error) {
		console.log(error)
		res.status(500).json({ message: error })
	}
}

const reportMessage = async (req: Request, res: Response) => {
	const { conversationId } = req.body

	try {
		await getConnection()
			.createQueryBuilder()
			.update(EmpireMessage)
			.set({
				// update rank
				messageFlags: 1,
			})
			.where('conversationId = :conversationId', { conversationId })
			.execute()

		res.status(200).json({ success: true })
	} catch (error) {
		console.log(error)
		res.status(500).json({ message: error })
	}
}

const toggleReport = async (req: Request, res: Response) => {
	const { uuid } = req.params

	try {
		const message = await EmpireMessage.findOne({
			where: { uuid: uuid },
		})

		if (message.messageFlags === 1) {
			message.messageFlags = 0
		} else {
			message.messageFlags = 1
		}

		await message.save()

		res.status(200).json({ message: 'Message report status changed' })
	} catch (error) {
		console.log(error)
		res.status(500).json({ message: error })
	}
}

const deleteMessage = async (req: Request, res: Response) => {}

const router = Router()

router.post('/conversations', user, auth, getConversations)
router.post('/messages', user, auth, getMessages)
router.post('/message/new', user, auth, postMessage)
router.get('/:id/count', user, auth, countNew)
router.get('/:id/check', user, auth, checkForNew)
router.get('/:id/read', user, auth, markRead)
// router.delete('/message', deleteMessage)
router.post('/clan', user, auth, getClanMessages)
router.post('/clan/new', user, auth, postClanMessage)
router.post('/clan/read', user, auth, readClanMessages)
router.post('/clan/unread', user, auth, unreadClanMessages)
router.post('/report', user, auth, reportMessage)
router.get('/togglereport/:uuid', user, auth, toggleReport)

export default router
