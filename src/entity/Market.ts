import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('market')
export default class Market extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	market_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	lock_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	type: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empire_id: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	amount: number

	@Column({
		type: 'int',
		default: 0,
	})
	price: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	time: number
}
