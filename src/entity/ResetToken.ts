import { IsEmail } from 'class-validator'
import {
	PrimaryGeneratedColumn,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
    Column,
    Entity,
} from 'typeorm'

@Entity('reset token')
export default class ResetToken extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date

	@Column()
	@IsEmail(undefined, { message: 'Must be a valid email address' })
	email: string

	@Column()
	selector: string

	@Column()
	verifier: string

	@Column()
	expiredAt: Date
}
