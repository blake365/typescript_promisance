import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan topics')
export default class ClanTopic extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanTopic_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	c_id: number

	@Column()
	clanTopicSubject: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanTopicFlags: number
}
