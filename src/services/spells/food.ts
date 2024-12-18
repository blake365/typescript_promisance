import { eraArray } from "../../config/eras"
import { raceArray } from "../../config/races"
import type Empire from "../../entity/Empire"
import { calcSizeBonus } from "../actions/actions"
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
		const food = Math.round(
			(empire.trpWiz *
				(empire.health / 100) *
				Math.max(
					0.8,
					calcSizeBonus(empire) *
						60 *
						(1 + Math.sqrt(empire.bldWiz / empire.land) / 2) *
						((100 + raceArray[empire.race].mod_magic) / 100) *
						Math.max(0.8, calcSizeBonus(empire) * 0.8),
				)) /
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
