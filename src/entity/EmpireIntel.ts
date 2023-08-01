import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'

import Model from './Model'

@Entity('empire intel')
export default class EmpireIntel extends Model {
	constructor(empireIntel: Partial<EmpireIntel>) {
		super()
		Object.assign(this, empireIntel)
	}
	// @PrimaryGeneratedColumn()
	// id: number

	// @PrimaryGeneratedColumn('uuid')
	// uuid: string
	@Index()
	@PrimaryGeneratedColumn()
	intel_id: number

	// @CreateDateColumn()
	// createdAt: Date

	// @UpdateDateColumn()
	// updatedAt: Date
	@Column({
		type: 'int',
		default: 0,
	})
	ownerId: number

	@Column({
		type: 'int',
		default: 0,
	})
	spiedEmpireId: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanId: number

	@Column({
		default: true,
	})
	shared: boolean

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100000,
	})
	cash: number

	@Column({
		type: 'int',
		default: 0,
	})
	era: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10000,
	})
	food: number

	@Column({
		type: 'int',
		default: 100,
	})
	health: number

	@Column({
		type: 'int',
		default: 250,
	})
	land: number

	@Column()
	name: string

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	networth: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 500,
	})
	peasants: number

	@Column({
		type: 'int',
		default: 0,
	})
	race: number

	@Column({
		type: 'int',
		default: 0,
	})
	rank: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	runes: number

	@Column({
		type: 'int',
		default: 25,
	})
	tax: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100,
	})
	trpArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 20,
	})
	trpFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 50,
	})
	trpLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10,
	})
	trpSea: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10,
	})
	trpWiz: number

	@Column({
		type: 'int',
		default: 0,
	})
	turns: number

	@Column({
		type: 'int',
		default: 0,
	})
	storedturns: number

	// @Column()
	// turns: number

	// @Column()
	// turnsUsed: number
}
