import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import EmpireEffect from "../../entity/EmpireEffect"
import { getPower_self, getWizLoss_self } from "./general"
import { translate } from "../../util/translation"

export const shield_cost = (baseCost: number) => {
	return Math.ceil(4.9 * baseCost)
}

export const shield_cast = async (empire: Empire, language: string) => {
	console.log("casting shield")

	const now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: empire.id, empireEffectName: "spell shield" },
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
		console.log(effectAge)
		effectAge = Math.floor(effectAge)

		console.log(effect)
	}

	if (getPower_self(empire) >= 15) {
		if (effect) {
			if (timeLeft <= 0) {
				effect.remove()
				console.log("expired")
				// create effect
				const empireEffectName = "spell shield"
				const empireEffectValue = 24 * 60
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
					message: translate("responses:spells.shield", language),
					wizloss: 0,
					descriptor: eraArray[empire.era].trpwiz,
				}
				return result
			}

			if (timeLeft < 14 * 60) {
				console.log("renew")
				// renew effect
				// console.log(effect)
				await effect.remove()

				let empireEffectName = "spell shield"
				let empireEffectValue = 24 * 60
				let effectOwnerId = empire.id

				let newEffect: EmpireEffect
				newEffect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await newEffect.save()

				let result = {
					result: "success",
					message: translate("responses:spells.shieldRenew", language),
				}
				return result
			}

			console.log("extend")
			// extend effect
			effect.empireEffectValue = Math.round(timeLeft + 3 * 60)

			// console.log(effect)
			await effect.save()

			const result = {
				result: "success",
				message: translate("responses:spells.shieldExtended", language),
				wizloss: 0,
				descriptor: eraArray[empire.era].trpwiz,
			}

			return result
		}

		// expired
		console.log("create")
		// create effect
		const empireEffectName = "spell shield"
		const empireEffectValue = 24 * 60
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
			message: translate("responses:spells.shield", language),
			wizloss: 0,
			descriptor: eraArray[empire.era].trpwiz,
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
