import { Request, Response, Router } from 'express'
import { validate, isEmpty } from 'class-validator'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'

import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import Session from '../entity/Session'

const mapErrors = (errors: Object[]) => {
	return errors.reduce((prev: any, err: any) => {
		prev[err.property] = Object.entries(err.constraints)[0][1]
		return prev
	}, {})
}

const register = async (req: Request, res: Response) => {
	const { email, username, password } = req.body

	const empires = []
	let errors: any = {}

	const emailUser = await User.findOne({ email })
	const usernameUser = await User.findOne({ username })

	if (emailUser) errors.email = 'Email is already in use'
	if (usernameUser) errors.username = 'Username is already taken'

	console.log(errors)
	if (Object.keys(errors).length > 0) {
		return res.status(500).json(errors)
	}

	// Create the user
	const user = new User({ email, username, password, empires })

	errors = await validate(user)

	if (errors.length > 0) {
		return res.status(400).json(mapErrors(errors))
	}
	await user.save()

	// Return the user
	return res.json(user)
}

const login = async (req: Request, res: Response) => {
	const { username, password } = req.body
	// console.log(username, password)
	try {
		let errors: any = {}
		if (isEmpty(username)) errors.username = 'Username must not be empty'
		if (isEmpty(password)) errors.password = 'Password must not be empty'
		if (Object.keys(errors).length > 0) {
			return res.status(400).json(errors)
		}

		const user = await User.findOne({ username }, { relations: ['empires'] })
		// console.log(user)

		if (!user) return res.status(404).json({ username: 'User not found' })

		const passwordMatches = await bcrypt.compare(password, user.password)

		if (!passwordMatches) {
			return res.status(401).json({ password: 'Password is incorrect' })
		}

		const token = jwt.sign({ username }, process.env.JWT_SECRET!)

		const data = token
		const time = 3600
		// console.log(token)
		try {
			res.set(
				'Set-Cookie',
				cookie.serialize('token', token, {
					// httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					maxAge: time,
					path: '/',
				})
			)
		} catch (error) {
			console.log(error)
		}

		const session = new Session()
		session.data = data
		session.time = time
		session.user_id = user.id
		if (user?.empires?.length > 0) {
			session.empire_id = user.empires[0].id
		}
		session.role = 'user'
		await session.save()

		user.lastIp =
			<string>req.connection.remoteAddress ||
			<string>req.headers['x-forwarded-for']

		await user.save()

		return res.json(user)
	} catch (err) {
		console.log(err)
		return res.json({ error: 'Something went wrong' })
	}
}

const me = (_: Request, res: Response) => {
	return res.json(res.locals.user)
}

const logout = async (_: Request, res: Response) => {
	res.set(
		'Set-Cookie',
		cookie.serialize('token', '', {
			// httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			expires: new Date(0),
			path: '/',
		})
	)

	const session = await Session.findOne({ user_id: res.locals.user.id })

	session.time = 0
	await session.save()

	return res.status(200).json({ success: true })
}

const demoAccount = async (req: Request, res: Response) => {
	const empires = []

	let ip =
		<string>req.connection.remoteAddress ||
		<string>req.headers['x-forwarded-for']
	// .split(',')[0]
	// .trim()

	console.log(req.headers['x-forwarded-for'])

	console.log(ip)
	// let IPaddress: string

	// process ip address or headers
	if (ip === '::1') {
		ip = 'localhost'
	} else if (ip.length > 15 && ip.split(':').length === 8) {
		let ipArr = ip.split(':')
		ipArr.splice(ipArr.length / 2, ipArr.length)
		ip = ipArr.join('.')
	} else if (ip.includes('::')) {
		ip = ip.split('::')[0]
	} else if (ip.length <= 15 && ip.includes('.')) {
		let ipArr = ip.split('.')
		ipArr.splice(ipArr.length - 1)
		ip = ipArr.join('.')
	} else {
		ip = ip
	}

	// console.log(ip)
	if (ip === '' || ip === undefined) {
		console.error('No IP address')
		return res.status(400).json({
			error:
				'An error occurred, please try again. Make an account if this problem persists.',
		})
	}

	const addOn = new Date().getDay()

	const email = ip + addOn + '@demo.com'
	const username = ip + addOn
	const password = 'none'
	const role = 'demo'

	// console.log(username)

	try {
		// Validate Data
		let errors: any = {}

		if (Object.keys(errors).length > 0) {
			return res.status(400).json(errors)
		}

		// Create the user
		const user = new User({ email, username, password, role, empires })

		errors = await validate(user)

		console.log(errors)
		if (errors.length > 0) {
			return res.status(400).json(mapErrors(errors))
		}
		await user.save()

		// console.log(user)
		const token = jwt.sign({ username }, process.env.JWT_SECRET!)

		const data = token
		const time = 3600
		// console.log(token)
		res.set(
			'Set-Cookie',
			cookie.serialize('token', token, {
				// httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: time,
				path: '/',
			})
		)

		const session = new Session()
		session.data = data
		session.time = time
		session.user_id = user.id
		if (user?.empires?.length > 0) {
			session.empire_id = user.empires[0].id
		}
		session.role = role
		await session.save()

		// Return the user
		return res.json(user)
	} catch (err) {
		console.log(err.code)
		if (err.code === '23505' || err.code === '23514' || err.code === '23502') {
			return res.status(500).json({
				error: 'Please wait a while before creating a new demo account',
			})
		}
	}
}

const router = Router()
router.post('/register', register)
router.post('/demo', demoAccount)
router.post('/login', login)
router.get('/me', user, auth, me)
router.get('/logout', user, auth, logout)

export default router
