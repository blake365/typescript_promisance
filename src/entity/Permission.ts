import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('permission')
export default class Permission extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	permission_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	type: number

	@Column()
	criteria: string

	@Column()
	reason: string

	@Column()
	comment: string

	@Column({
		type: 'int',
		default: 0,
	})
	createTime: number

	@Column({
		type: 'int',
		default: 0,
	})
	updateTime: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	lastHit: number

	@Column({
		type: 'int',
		default: 0,
	})
	hitCount: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	expire: number
}
