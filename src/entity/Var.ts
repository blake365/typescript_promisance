import { Entity, Column, Index, PrimaryColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('vars')
export default class Var extends Model {
	@Index()
	@PrimaryColumn()
	name: string

	@Column()
	value: string
}
