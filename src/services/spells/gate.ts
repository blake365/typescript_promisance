import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import EmpireEffect from "../../entity/EmpireEffect"
import { translate } from "../../util/translation"
import { getPower_self, getWizLoss_self } from "./general"

export const gate_cost = (baseCost: number) => {
	return Math.ceil(20.0 * baseCost)
}

export const gate_cast = async (empire: Empire, language: string) => {
	const now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: empire.id, empireEffectName: "time gate" },
		order: { createdAt: "DESC" },
	})

	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let timeLeft = 0
	if (effect) {
		let effectAge =
			(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
		timeLeft = effect.empireEffectValue - effectAge
		console.log(effectAge)
		effectAge = Math.floor(effectAge)
	}
	// age in minutes

	console.log(effect)

	if (getPower_self(empire) >= 65) {
		if (effect) {
			if (timeLeft <= 0) {
				await effect.remove()
				console.log("expired")
				// create effect
				const empireEffectName = "time gate"
				const empireEffectValue = 12 * 60
				const effectOwnerId = empire.id

				const newEffect: EmpireEffect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await newEffect.save()

				const result = {
					result: "success",
					message: translate("responses:spells.timeGateSuccess", language),
					wizloss: 0,
					descriptor: eraArray[empire.era].trpwiz,
				}
				return result
			}
			if (timeLeft < 9 * 60) {
				console.log("renew")
				// renew effect
				// console.log(effect)
				await effect.remove()

				const empireEffectName = "time gate"
				const empireEffectValue = 12 * 60
				const effectOwnerId = empire.id

				const newEffect: EmpireEffect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await newEffect.save()

				const result = {
					result: "success",
					message: translate("responses:spells.timeGateRenew", language),
				}
				return result
			}

			console.log("extend")
			// extend effect
			effect.empireEffectValue += Math.round(timeLeft + 3 * 60)

			// console.log(effect)
			await effect.save()

			let result = {
				result: "success",
				message: translate("responses:spells.timeGateExtend", language),
			}
			return result
		}

		console.log("create")
		// create effect
		const empireEffectName = "time gate"
		const empireEffectValue = 12 * 60
		const effectOwnerId = empire.id

		const secondEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		})
		// console.log(effect)
		await secondEffect.save()

		const result = {
			result: "success",
			message: translate("responses:spells.timeGateSuccess", language),
		}
		return result
	}

	const wizloss = getWizLoss_self(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.spellFail", language),
		wizloss: wizloss,
		descriptor: eraArray[empire.era].trpwiz,
	}

	return result
}
