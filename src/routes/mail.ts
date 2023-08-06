import EmpireMessage from '../entity/EmpireMessage'
import { Router, Request, Response } from 'express'
import user from '../middleware/user'
import auth from '../middleware/auth'

const concatenateIntegers = (a, b) => {
	// if (isNaN(a) || isNaN(b)) {
	// 	throw new Error('Both inputs must be integers.')
	// }

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
	const { sourceId, sourceName, destinationId, destinationName, message } =
		req.body

	// check for existing conversation
	const conversationId1 = concatenateIntegers(sourceId, destinationId)
	const conversationId2 = concatenateIntegers(destinationId, sourceId)
	let conversation1 = null
	let conversation2 = null
	console.log('conversationId1', conversationId1)
	console.log('conversationId2', conversationId2)

	conversation1 = await EmpireMessage.find({
		where: { conversationId: conversationId1 },
	})

	console.log('conversation1', conversation1)

	conversation2 = await EmpireMessage.find({
		where: { conversationId: conversationId2 },
	})

	console.log('conversation2', conversation2)

	if (!conversation1 && !conversation2) {
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

const deleteMessage = async (req: Request, res: Response) => {}

const router = Router()

router.post('/conversations', getConversations)
router.post('/messages', getMessages)
router.post('/message/new', postMessage)
// router.delete('/message', deleteMessage)

export default router
