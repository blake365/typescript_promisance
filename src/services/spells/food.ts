import { eraArray } from "../../config/eras"
import { raceArray } from "../../config/races"
import type Empire from "../../entity/Empire"
import { calcSizeFactors } from "../actions/actions"
import { getPower_self, getWizLoss_self } from "./general"
import { translate } from "../../util/translation"

export const food_cost = (baseCost: number) => {
	return Math.ceil(17.5 * baseCost)
}

export const food_cast = (
	empire: Empire,
	pvtmFood: number,
	language: string,
) => {
	if (getPower_self(empire) >= 30) {
		// Use new size factors instead of old bonus
		const sizeFactors = calcSizeFactors(empire, 10000000, 0) // Default values
		const efficiency = sizeFactors.economicEfficiency // 0.9-1.3 range

		const food = Math.round(
			(empire.trpWiz *
				(empire.health / 100) *
				efficiency *
				60 *
				(1 + Math.sqrt(empire.bldWiz / empire.land) / 2) *
				((100 + raceArray[empire.race].mod_magic) / 100) *
				efficiency) /  // Applied twice in original formula
				pvtmFood,
		)

		const result = {
			result: "success",
			message: translate("responses:spells.food", language),
			wizloss: 0,
			food: food,
			descriptor: eraArray[empire.era].food,
		}
		return result
	}

	const wizloss = getWizLoss_self(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.spellFail", language),
		wizloss: wizloss,
		food: 0,
		descriptor: eraArray[empire.era].trpwiz,
	}
	return result
}
