import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

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
}
