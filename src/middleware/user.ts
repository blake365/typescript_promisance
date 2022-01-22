import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '../entity/User'

export default async (req: Request, res: Response, next: NextFunction) => {
	try {
		const token = req.cookies.token
		if (!token) return next()

		const { username }: any = jwt.verify(token, process.env.JWT_SECRET!)

		const user = await User.findOne({ username })

		res.locals.user = user

		return next()
	} catch (error) {
		console.log(error)
		return res.status(401).json({ error: 'Unauthenticated' })
	}
}
