import Empire from '../../entity/Empire'
import { getNetworth } from './actions'
import {
	PVTM_TRPARM,
	PVTM_TRPFLY,
	PVTM_TRPLND,
	PVTM_TRPSEA,
} from '../../config/conifg'
import Game from '../../entity/Game'

export const updateEmpire = async (
	empire: Empire,
	spellRes: any,
	turns: number,
	game: Game
) => {
	// console.log(spellRes)
	// console.log(empire.cash)
	empire.cash =
		empire.cash +
		// Math.round(spellRes.withdraw / turns) +
		spellRes.money

	empire.income += spellRes.income
	empire.expenses += spellRes.expenses + spellRes.wartax + spellRes.corruption

	// empire.bank -= Math.round(spellRes.withdraw / turns)
	empire.bank += spellRes.bankInterest
	empire.loan += spellRes.loanInterest
	empire.loan -= spellRes.loanpayed
	empire.trpArm += spellRes.trpArm
	empire.trpLnd += spellRes.trpLnd
	empire.trpFly += spellRes.trpFly
	empire.trpSea += spellRes.trpSea

	empire.indyProd +=
		spellRes.trpArm * game.pvtmTrpArm +
		spellRes.trpLnd * game.pvtmTrpLnd +
		spellRes.trpFly * game.pvtmTrpFly +
		spellRes.trpSea * game.pvtmTrpSea

	empire.food += spellRes.food
	if (empire.food < 0) {
		empire.food = 0
	}

	empire.foodpro += spellRes.foodpro
	empire.foodcon += spellRes.foodcon

	empire.peasants += spellRes.peasants
	empire.runes += spellRes.runes
	empire.trpWiz += spellRes.trpWiz
	empire.turns -= turns
	empire.turnsUsed += turns
	empire.lastAction = new Date()

	empire.networth = getNetworth(empire, game)
	if (empire.peakCash < empire.cash + empire.bank) {
		empire.peakCash = empire.cash + empire.bank
	}
	if (empire.peakFood < empire.food) {
		empire.peakFood = empire.food
	}
	if (empire.peakRunes < empire.runes) {
		empire.peakRunes = empire.runes
	}
	if (empire.peakPeasants < empire.peasants) {
		empire.peakPeasants = empire.peasants
	}
	if (empire.peakLand < empire.land) {
		empire.peakLand = empire.land
	}
	if (empire.peakNetworth < empire.networth) {
		empire.peakNetworth = empire.networth
	}
	if (empire.peakTrpArm < empire.trpArm) {
		empire.peakTrpArm = empire.trpArm
	}
	if (empire.peakTrpLnd < empire.trpLnd) {
		empire.peakTrpLnd = empire.trpLnd
	}
	if (empire.peakTrpFly < empire.trpFly) {
		empire.peakTrpFly = empire.trpFly
	}
	if (empire.peakTrpSea < empire.trpSea) {
		empire.peakTrpSea = empire.trpSea
	}
	if (empire.peakTrpWiz < empire.trpWiz) {
		empire.peakTrpWiz = empire.trpWiz
	}

	await empire.save()
}
