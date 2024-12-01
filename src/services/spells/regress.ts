import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_self, getWizLoss_self } from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { translate } from "../../util/translation"

export const regress_cost = (baseCost: number) => {
	return Math.ceil(47.5 * baseCost)
}

export const regress_allow = async ({ era, id }, language: string) => {
	console.log("casting regress")

	const now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: id, empireEffectName: "era delay" },
		order: { updatedAt: "DESC" },
	})

	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let timeLeft = 0

	if (effect) {
		let effectAge =
			(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
		timeLeft = effect.empireEffectValue - effectAge
		// age in minutes
		// console.log(effectAge)
		effectAge = Math.floor(effectAge)

		// console.log(effect)
	}

	let errorMessage = null // Initialize the error message to null

	if (timeLeft <= 0 && effect) {
		effect.remove()
		console.log("expired")
	} else if (timeLeft > 0) {
		// convert timeLeft to hours and minutes
		const hours = Math.floor(timeLeft / 60)
		const minutes = Math.round(timeLeft % 60)

		errorMessage = translate("responses:spells.advanceWait", language, {
			hours: hours,
			minutes: minutes,
		})
	}

	// console.log(errorMessage)

	if (eraArray[era].era_prev < 0) {
		return false
	}
	if (errorMessage !== null) {
		return errorMessage
	}
	return true
}

export const regress_cast = (empire: Empire, language: string) => {
	if (getPower_self(empire) >= 80) {
		let effect: EmpireEffect = null
		effect = new EmpireEffect({
			effectOwnerId: empire.id,
			empireEffectName: "era delay",
			empireEffectValue: 4320,
		})
		effect.save()

		const result = {
			result: "success",
			message: translate("responses:spells.regressSuccess", language),
			wizloss: 0,
			descriptor: null,
		}
		return result
	}
	const wizloss = getWizLoss_self(empire)
	const result = {
		result: "fail",
		message: "Spell failed",
		wizloss: wizloss,
		descriptor: eraArray[empire.era].trpwiz,
	}
	return result
}
