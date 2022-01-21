import { Entity, Column, PrimaryColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('var adjust')
export default class VarAdjust extends Model {
	@PrimaryColumn()
	name: string

	@Column({
		type: 'bigint',
		default: 0,
	})
	offset: number
}
