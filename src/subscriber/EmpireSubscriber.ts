import {
	EventSubscriber,
	EntitySubscriberInterface,
	UpdateEvent,
} from 'typeorm'
import Empire from '../entity/Empire'
import { achievements } from '../config/achievements'

async function updateEmpire(id: number, achievements: any) {
	const empire = await Empire.findOne({ id: id })
	// console.log(empire)
	empire.achievements = achievements
	await empire.save()
	console.log('saved')
	return 'saved'
}

function sortObject(obj) {
	return Object.keys(obj)
		.sort()
		.reduce((result, key) => {
			result[key] = obj[key]
			return result
		}, {})
}

@EventSubscriber()
export class EmpireSubscriber implements EntitySubscriberInterface {
	listenTo() {
		return Empire // what's the name of the entity you listen to?
	}

	/**
	 * Called after entity update.
	 */
	afterUpdate(event: UpdateEvent<Empire>) {
		// console.log(`AFTER ENTITY UPDATED: `, event.entity.id)
		// console.log(event.entity.name)
		// console.log('starting', event.entity.achievements)

		if (event.entity.id > 0) {
			let newAchievements = JSON.parse(
				JSON.stringify(event.entity.achievements)
			) // loop through achievements
			// check if a key is true, if so exclude it from the array
			// recombine array
			let achieve = achievements.map((achievement) => {
				let keys = achievement.keys
				let newKeys = keys.filter((key) => {
					return event.entity.achievements[key]?.awarded === false
				})
				achievement.keys = newKeys
				return achievement
			})
			// console.log('achieve', achieve)

			for (const { property, thresholds, keys } of achieve) {
				for (let i = 0; i < keys.length; i++) {
					// console.log('hi')
					// console.log(keys[i], event.entity.achievements[keys[i]].awarded)
					// if property does not exist on the existing achievements object, add it
					if (!event.entity.achievements[keys[i]]) {
						newAchievements[keys[i]] = {
							awarded: false,
							timeAwarded: null,
						}
					}
					if (
						property === 'rank' &&
						event.entity[property] === thresholds[i] &&
						event.entity.turnsUsed >= 1000 &&
						newAchievements['rank1'].awarded === false
					) {
						// console.log('awarding')
						newAchievements[keys[i]] = {
							awarded: true,
							timeAwarded: new Date().toISOString(),
						}
						break
					} else if (
						property === 'freeLand' &&
						event.entity[property] === thresholds[i] &&
						event.entity.turnsUsed >= 10 &&
						newAchievements['build'].awarded === false
					) {
						// console.log(event.entity.turnsUsed, typeof event.entity.turnsUsed)
						// console.log('awarding')
						newAchievements[keys[i]] = {
							awarded: true,
							timeAwarded: new Date().toISOString(),
						}
						break
					} else if (
						event.entity[property] >= thresholds[i] &&
						property !== 'rank' &&
						property !== 'freeLand'
					) {
						// console.log('final check')
						// console.log('awarding')
						newAchievements[keys[i]] = {
							awarded: true,
							timeAwarded: new Date().toISOString(),
						}
						break
					}
				}
			}
			// console.log(newAchievements)
			// console.log(event.entity.achievements)
			if (
				JSON.stringify(sortObject(newAchievements)) !==
				JSON.stringify(sortObject(event.entity.achievements))
			) {
				// The objects are different, so you can update the empire
				console.log('updating empire')
				updateEmpire(event.entity.id, newAchievements)
			}
			// console.log(status)
		}
	}
}
