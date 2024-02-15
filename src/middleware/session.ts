import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '../entity/User'

// get session from query parameter
export default async (req: Request, res: Response, next: NextFunction) => {
	try {
		const activeSessionId = req.query.activeSessionId
		// if (!token) return next()

		return next()
	} catch (error) {
		console.log(error)
		return res.status(401).json({ error: 'Unauthenticated' })
	}
}
