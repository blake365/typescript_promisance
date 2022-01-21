import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('turn log')
export default class TurnLog extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	turn_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	time: number

	@Column({
		type: 'int',
		default: 0,
	})
	ticks: number

	@Column({
		type: 'int',
		default: 0,
	})
	interval: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	type: number

	@Column({
		type: 'text',
	})
	text: string
}
