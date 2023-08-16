import { EventSubscriber, EntitySubscriberInterface } from 'typeorm'
import Empire from '../entity/Empire'

// @EventSubscriber()
// export class EmpireSubscriber implements EntitySubscriberInterface {
// 	listenTo() {
// 		return Empire // what's the name of the entity you listen to?
// 	}
// 	/**
// 	 * Called after entity is loaded.
// 	 */
// 	async afterLoad(entity: Empire) {
// 		console.log(`AFTER ENTITY LOADED: `, entity)
// 		entity.updatedAt = new Date()
// 		await entity.save()
// 	}
// }
