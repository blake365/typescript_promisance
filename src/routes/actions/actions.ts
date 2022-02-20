import Empire from '../../entity/Empire'

export const farm = (turns) => {}

export const cash = (turns) => {}

export const explore = (turns: number, empire: Empire) => {
	for (let i = 0; i < turns; i++) {
		const land = giveLand(empire)
		empire.land += land
		empire.freeLand += land
		empire.save()
	}
}

export const exploreAlt = (empire: Empire) => {
	const land = giveLand(empire)
	empire.land += land
	empire.freeLand += land
	return land
}

export const calcSizeBonus = ({ networth }) => {
	let net = Math.max(networth, 1)
	let size = Math.atan(generalLog(net, 1000) - 1) * 2.1 - 0.65
	size = Math.round(Math.min(Math.max(0.5, size), 1.7) * 1000) / 1000
	return size
}

//TODO: needs race and era modifier
export const calcPCI = (empire: Empire) => {
	const { bldCash, land } = empire
	return Math.round(25 * (1 + bldCash / Math.max(land, 1)))
}

export const giveLand = (empire: Empire) => {
	return Math.ceil((1 / (empire.land * 0.00022 + 0.25)) * 40)
	//TODO: needs race and era modifier
}

// const getModifier = (name: string) => {
//     name = 'mod' + name
//     let mod = 100
//     if()
// }

export const getNetworth = (empire: Empire) => {
	let networth = 0

	//troops
	networth += empire.trpArm * 1
	networth += (empire.trpLnd * 1000) / 500
	networth += (empire.trpFly * 2000) / 500
	networth += (empire.trpSea * 3000) / 500
	networth += empire.trpWiz * 2
	networth += empire.peasants * 3
	// Cash
	networth += (empire.cash + empire.bank / 2 - empire.loan * 2) / (5 * 500)
	networth += empire.land * 500
	networth += empire.freeLand * 100

	// Food, reduced using logarithm to prevent it from boosting networth to ludicrous levels
	networth += (empire.food / Math.log10(Math.max(10, empire.food))) * (30 / 500)

	return Math.max(0, Math.floor(networth))
}

function generalLog(number: number, base: number) {
	return Math.log(base) / Math.log(number)
}
