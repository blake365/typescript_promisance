import type Empire from '../../entity/Empire'
import { getRandomInt } from '../../util/helpers'

interface buildGain {
	[key: string]: number
}

interface buildLoss {
	[key: string]: number
}

/**
 * Destroys buildings during an attack.
 * @param attackType - The type of attack.
 * @param pcloss - The percentage of buildings lost during the attack.
 * @param pcgain - The percentage of buildings gained during the attack.
 * @param type - The type of building being attacked.
 * @param defender - The defending empire.
 * @param attacker - The attacking empire.
 * @param buildLoss - The object to track the loss of buildings.
 * @param buildGain - The object to track the gain of buildings.
 * @returns An object containing the updated buildGain and buildLoss.
 */
export const destroyBuildings = async (
	attackType: string,
	pcloss: number,
	pcgain: number,
	type: string,
	defender: Empire,
	attacker: Empire,
	buildLoss: buildLoss,
	buildGain: buildGain
) => {
	// console.log(attackType)

	if (
		attackType === 'trplnd' ||
		attackType === 'trpfly' ||
		attackType === 'trpsea'
	) {
		if (attackType === 'trpfly') {
			// air strikes destroy more, take more land, but gain fewer buildings
			pcloss *= 1.25
			pcgain *= 0.92
		} else if (type === 'bldDef' || type === 'bldWiz') {
			// towers are even more likely to be destroyed by land/sea attacks (and more likely to be destroyed)
			pcloss *= 1.3
			pcgain *= 0.88
		} else {
			// while land/sea attacks simply have a higher chance of destroying the buildings stolen
			pcgain *= 0.96
		}
	} else if (attackType === 'pillage') {
	}

	// console.log(pcgain)
	// console.log(pcloss)

	let loss = Math.min(
		getRandomInt(
			defender[type] * 0.01,
			Math.ceil(
				((defender[type] * pcloss + 2) * (100 - defender.diminishingReturns)) /
					100
			)
		),
		defender[type]
	)

	let gain = Math.ceil(loss * pcgain)
	// console.log('gain: ', gain)

	if (typeof buildLoss[type] === 'undefined') buildLoss[type] = 0
	if (typeof buildGain[type] === 'undefined') buildGain[type] = 0
	if (typeof buildGain['freeLand'] === 'undefined') buildGain['freeLand'] = 0
	if (typeof buildLoss['freeLand'] === 'undefined') buildLoss['freeLand'] = 0

	switch (attackType) {
		case 'standard':
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker[type] += gain
			buildGain[type] += gain
			attacker.freeLand += loss - gain
			buildGain['freeLand'] += loss - gain
			break
		case 'pillage':
			// attacks don't steal buildings, they just destroy them
			loss = Math.round(loss * 0.15)
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker.freeLand += loss
			buildGain['freeLand'] += loss
			break
		case 'surprise':
		case 'trparm':
			// attacks don't steal buildings, they just destroy them
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker.freeLand += loss
			buildGain['freeLand'] += loss
			break
		case 'trplnd':
		case 'trpfly':
		case 'trpsea':
			// console.log(buildGain.freeLand)
			// console.log(buildLoss.freeLand)
			if (type === 'freeLand') {
				// for stealing unused land, the 'gain' percent is zero
				gain = loss
				// so we need to use the 'loss' value instead
			}
			defender.land -= gain
			defender.attackLosses += gain
			defender[type] -= loss
			buildLoss[type] += loss
			defender.freeLand += loss - gain
			// buildLoss['freeLand'] will be negative because the free land is increasing as buildings are destroyed
			buildLoss['freeLand'] -= loss - gain
			attacker.land += gain
			attacker.attackGains += gain
			attacker.freeLand += gain
			buildGain['freeLand'] += gain
			break
	}

	// console.log('buildLoss: ', buildLoss)
	// console.log('buildGain: ', buildGain)

	return { buildGain, buildLoss }
}
