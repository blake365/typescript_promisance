import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

// sgMail.setApiKey(process.env.SEND_GRID)

// export const sendEmail = async (
// 	to: string,
// 	from: string,
// 	subject: string,
// 	text: string,
// 	html: string
// ) => {
// 	const msg = {
// 		to: to, // Change to your recipient
// 		from: from, // Change to your verified sender
// 		subject: subject,
// 		text: text,
// 		html: html,
// 	}

// 	sgMail
// 		.send(msg)
// 		.then(() => {
// 			console.log('Email sent')
// 		})
// 		.catch((error) => {
// 			console.error(error.response.body)
// 		})
// }

// export const sendEmailWithAttachments = (
// 	from = 'from@example.com',
// 	to = 'to@example.com',
// 	subject = 'Hello World',
// 	text = 'Hello World',
// 	html = '<h1>Hello World</h1>'
// ) => {
// 	const ses = new sesClientModule.SESClient({
// 		region: 'us-east-2', // e.g. us-west-2
// 		credentials: {
// 			accessKeyId: process.env.SES_ACCESS_KEY_ID,
// 			secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
// 		},
// 	})
// 	const transporter = nodemailer.createTransport({
// 		SES: {
// 			ses,
// 			aws: sesClientModule,
// 		},
// 	})

// 	return new Promise((resolve, reject) => {
// 		transporter.sendMail(
// 			{
// 				from,
// 				to,
// 				subject: 'Hello World',
// 				text: 'Greetings from Amazon SES!',
// 				html: '<h1>Hello World</h1>',
// 			},
// 			(err, info) => {
// 				if (err) {
// 					reject(err)
// 				} else {
// 					resolve(info)
// 				}
// 			}
// 		)
// 	})
// }

export const sendSESEmail = async (to, from, subject, text, html) => {
	const sesClient = new SESClient({
		region: 'us-east-2',
		credentials: {
			accessKeyId: process.env.SES_ACCESS_KEY_ID,
			secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
		},
	})

	const params = {
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Body: {
				// HTML body part
				Html: {
					Data: html,
				},
				// Text body part
				Text: {
					Data: text,
				},
			},
			Subject: { Data: subject },
		},
		Source: from,
	}

	try {
		const data = await sesClient.send(new SendEmailCommand(params))
		console.log('Success', data)
		return data
	} catch (err) {
		console.error('Error', err.stack)
	}
}

// import { Request, Response, Router } from 'express'

// READ
// const testMail = async (req: Request, res: Response) => {
// 	try {
// 		sendSESEmail(
// 			'admin@neopromisance.com',
// 			'admin@neopromisance.com',
// 			'test',
// 			'test',
// 			'<h1>test</h1>'
// 		)

// 		return res.json({ message: 'sent' })
// 	} catch (error) {
// 		console.log(error)
// 		return res.status(500).json(error)
// 	}
// }

// const router = Router()

// router.get('/send', testMail)

// export default router
