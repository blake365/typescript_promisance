import { Entity, PrimaryColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('lock')
export default class Lock extends Model {
	@PrimaryColumn({
		type: 'int',
		default: 0,
	})
	lock_id: number

	@PrimaryColumn({
		type: 'int',
		default: 0,
	})
	type: number
}
