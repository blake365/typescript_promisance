import { NextFunction, Request, Response } from 'express'

export default async (req: Request, res: Response, next: NextFunction) => {
	try {
		// console.log(req.params.uuid)
		// console.log(res.locals.user.empires[0].uuid)
		if (res.locals.user.empires[0].uuid !== req.params.uuid) {
			throw new Error()
		}

		return next()
	} catch (error) {
		console.log(error)
		return res.status(401).json({ error: 'Unauthenticated' })
	}
}
