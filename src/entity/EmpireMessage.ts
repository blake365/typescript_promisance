import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('empire messages')
export default class EmpireMessage extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	empireMessage_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	messageIdRef: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	messageTime: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	messageFlags: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireIdSource: number

	@Column({
		default: '',
	})
	empireSourceName: string

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireIdDestination: number

	@Column({
		default: '',
	})
	empireDestinationName: string

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	conversationId: number

	@Column()
	messageSubject: string

	@Column({
		type: 'text',
	})
	messageBody: string
}
