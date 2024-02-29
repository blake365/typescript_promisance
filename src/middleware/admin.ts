import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '../entity/User'

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token
    if (!token) throw new Error('Unauthorized')

    const { username }: any = jwt.verify(token, process.env.JWT_SECRET!)

    const user = await User.findOne({ username })

    if (user.role !== 'admin') throw new Error('Unauthorized')

    res.locals.user = user

    return next()
  } catch (error) {
    console.error(error)
    return res.status(403).json({ error: 'Unauthorized' })
  }
}
