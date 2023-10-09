import EmpireMessage from '../entity/EmpireMessage'
import { Router, Request, Response } from 'express'
import user from '../middleware/user'
import auth from '../middleware/auth'
import { getConnection } from 'typeorm'

const Filter = require('bad-words')

const concatenateIntegers = (a, b) => {
	const strA = a.toString()
	const strB = b.toString()

	return parseInt(strA + strB)
}

const getConversations = async (req: Request, res: Response) => {
	const { empireId } = req.body

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
	console.log('marking mail as read')
	const { id } = req.params

	await getConnection()
		.createQueryBuilder()
		.update(EmpireMessage)
		.set({ seen: true })
		.where({ conversationId: id })
		.execute()

	return res.json({ success: true })
}

const deleteMessage = async (req: Request, res: Response) => {}

const router = Router()

router.post('/conversations', user, auth, getConversations)
router.post('/messages', user, auth, getMessages)
router.post('/message/new', user, auth, postMessage)
router.get('/:id/count', countNew)
router.get('/:id/check', user, auth, checkForNew)
router.get('/:id/read', user, auth, markRead)
// router.delete('/message', deleteMessage)

export default router
