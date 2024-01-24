import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

@Entity('session')
export default class Session extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	session_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	time: number

	@Column({
		type: 'text',
	})
	data: string

	@Column({
		type: 'text',
		default: 'user',
	})
	role: string

	@Column({
		type: 'int',
		default: 0,
	})
	user_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empire_id: number
}
