import { Exclude } from 'class-transformer'
import {
	PrimaryGeneratedColumn,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm'

export default abstract class Model extends BaseEntity {
	@Exclude()
	@PrimaryGeneratedColumn()
	id: number

	@Exclude()
	@PrimaryGeneratedColumn('uuid')
	uuid: string

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date

	// hide a column from view
	// toJSON() {
	// 	return { ...this, id: undefined }
	// }
}
