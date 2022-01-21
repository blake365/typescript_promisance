import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('log')
export default class Log extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	log_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	time: number

	@Column({
		type: 'int',
		default: 0,
	})
	type: number

	@Column()
	ip: string

	@Column()
	page: string

	@Column()
	action: string

	@Column()
	locks: string

	@Column({
		type: 'text',
	})
	text: string

	@Column({
		type: 'int',
		default: 0,
	})
	user_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	empire_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	clan_id: number
}
