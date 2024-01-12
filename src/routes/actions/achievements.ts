import Empire from '../../entity/Empire'
import { achievements } from '../../config/achievements'

function sortObject(obj: Record<string, unknown>) {
	return Object.keys(obj)
		.sort()
		.reduce((result, key) => {
			result[key] = obj[key]
			return result
		}, {})
}

export const awardAchievements = async (empire: Empire) => {
	try {
		let newAchievements = await JSON.parse(JSON.stringify(empire.achievements)) // loop through achievements
		// check if a key is true, if so exclude it from the array
		// recombine array
		let achieve = achievements.map((achievement) => {
			let keys = achievement.keys
			// console.log(keys)
			let newKeys = keys.filter((key) => {
				return empire.achievements[key]?.awarded === false
			})
			achievement.keys = newKeys
			// let thresholds = achievement.thresholds.slice(0, newKeys.length)
			// achievement.thresholds = thresholds
			// console.log(achievement)
			return achievement
		})
		// console.log('achieve', achieve)

		for (const { property, thresholds, keys } of achieve) {
			// console.log(`Checking achievement for property: ${property}`)

			for (let i = 0; i < keys.length; i++) {
				// console.log(`Checking key: ${keys[i]}`)
				// console.log(`Checking threshold: ${thresholds[i]}`)
				// console.log(`entity value: ${empire[property]}`)
				if (
					property === 'rank' &&
					empire[property] === thresholds[i] &&
					empire.turnsUsed >= 1000 &&
					newAchievements['rank1'].awarded === false
				) {
					console.log('Awarding rank achievement')
					newAchievements[keys[i]] = {
						awarded: true,
						timeAwarded: new Date().toISOString(),
					}
				} else if (
					property === 'freeLand' &&
					empire[property] === thresholds[i] &&
					empire.turnsUsed >= 10 &&
					newAchievements['build'].awarded === false
				) {
					console.log('Awarding freeLand achievement')
					newAchievements[keys[i]] = {
						awarded: true,
						timeAwarded: new Date().toISOString(),
					}
				} else if (
					empire[property] >= thresholds[i] &&
					property !== 'rank' &&
					property !== 'freeLand'
				) {
					console.log(`Awarding achievement for property: ${property}`)
					newAchievements[keys[i]] = {
						awarded: true,
						timeAwarded: new Date().toISOString(),
					}
				}
			}
		}

		// console.log('newAchievements', newAchievements)
		if (
			JSON.stringify(sortObject(newAchievements)) !==
			JSON.stringify(sortObject(empire.achievements))
		) {
			empire.achievements = newAchievements
			await empire.save()
			return 'updated'
		} else {
			return 'no change'
		}
	} catch (error) {
		console.log(error)
		return 'error'
	}
}
