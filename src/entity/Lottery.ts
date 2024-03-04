import { Entity, Column, Index } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('lottery')
export default class Lottery extends Model {
	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empire_id: number

	@Index()
	@Column({
		type: 'bigint',
		default: 0,
	})
	cash: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	ticket: number

	@Column({
		type: 'int',
		default: 1,
	})
	game_id: number
}
