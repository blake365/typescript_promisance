import { Router } from 'express'
import games from './games'
import admin from './admin'
import aid from './aid'
import archives from './archives'
import auth from './auth'
import attack from './attack'
import build from './build'
import chron from './chron'
import empire from './empire'
import clan from './clan'
import demolish from './demolish'
import dropLand from './dropLand'
import effects from './effects'
import intel from './intel'
import magic from './magic'
import mail from './mail'
import lottery from './lottery'
import news from './news'
import privateMarket from './privateMarket'
import publicMarket from './publicMarket'
import sessions from './sessions'
import snapshots from './snapshots'
import time from './time'
import useturns from './useturns'

const router = Router()

router.use('/games', games)
router.use('/admin', admin)
router.use('/aid', aid)
router.use('/archives', archives)
router.use('/auth', auth)
router.use('/attack', attack)
router.use('/build', build)
router.use('/cron', chron)
router.use('/empire', empire)
router.use('/clans', clan)
router.use('/demolish', demolish)
router.use('/drop', dropLand)
router.use('/effects', effects)
router.use('/intel', intel)
router.use('/magic', magic)
router.use('/messages', mail)
router.use('/lottery', lottery)
router.use('/news', news)
router.use('/privateMarket', privateMarket)
router.use('/publicMarket', publicMarket)
router.use('/session', sessions)
router.use('/snapshots', snapshots)
router.use('/time', time)
router.use('/useturns', useturns)

export default router
