import type {
	EntitySubscriberInterface,
	UpdateEvent,
	EntityManager,
} from 'typeorm'
import { EventSubscriber } from 'typeorm'
import Empire from '../entity/Empire'
import { achievements } from '../config/achievements'

function sortObject(obj: Record<string, unknown>) {
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
	async afterUpdate(event: UpdateEvent<Empire>) {
		// console.log(`AFTER ENTITY UPDATED: `, event.entity.id)
		// console.log(event.entity.name)
		// console.log('starting', event.entity.achievements)
		const theAchievements = achievements
		if (event?.entity?.id > 0) {
			// console.log('empire found', event.entity.id)
			// console.log(event.entity.achievements)
			const newAchievements = JSON.parse(
				JSON.stringify(event.entity.achievements)
			) // loop through achievements
			// check if a key is true, if so exclude it from the array
			// recombine array
			const achieve = theAchievements.map((achievement) => {
				const newAchievement = { ...achievement }
				const keys = achievement.keys
				// console.log(keys)
				const newKeys = keys.filter((key) => {
					return event.entity.achievements[key]?.awarded === false
				})
				newAchievement.keys = newKeys
				// let thresholds = achievement.thresholds.slice(0, newKeys.length)
				// achievement.thresholds = thresholds
				// console.log(achievement)
				return newAchievement
			})
			// console.log('achieve', achieve)

			for (const { property, thresholds, keys } of achieve) {
				// console.log(`Checking achievement for property: ${property}`)
				for (let i = 0; i < keys.length; i++) {
					// console.log(`Checking key: ${keys[i]}`)
					// console.log(`Checking threshold: ${thresholds[i]}`)
					// console.log(`entity value: ${event.entity[property]}`)
					if (
						property === 'rank' &&
						event.entity[property] === thresholds[i] &&
						event.entity.turnsUsed >= 1000 &&
						newAchievements['rank1'].awarded === false
					) {
						// console.log('Awarding rank achievement')
						newAchievements[keys[i]] = {
							awarded: true,
							timeAwarded: new Date().toISOString(),
						}
					} else if (
						property === 'freeLand' &&
						event.entity[property] === thresholds[i] &&
						event.entity.turnsUsed >= 10 &&
						newAchievements['build'].awarded === false
					) {
						// console.log('Awarding freeLand achievement')
						newAchievements[keys[i]] = {
							awarded: true,
							timeAwarded: new Date().toISOString(),
						}
					} else if (
						event.entity[property] >= thresholds[i] &&
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
			// console.log(newAchievements)
			// console.log(event.entity.achievements)
			if (
				JSON.stringify(sortObject(newAchievements)) !==
				JSON.stringify(sortObject(event.entity.achievements))
			) {
				// The objects are different, so you can update the empire
				console.log('updating empire achievements')
				await event.manager.transaction(async (manager: EntityManager) => {
					await manager
						.createQueryBuilder()
						.update(Empire)
						.set({ achievements: newAchievements })
						.where({
							id: event.entity.id,
						})
						.execute()
				})
			}
			// console.log(status)
		}
	}
}
