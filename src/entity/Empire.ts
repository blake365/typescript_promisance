import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ManyToOne,
} from 'typeorm'

import Model from './Model'
import User from './User'

@Entity('empires')
export default class Empire extends Model {
	constructor(empire: Partial<Empire>) {
		super()
		Object.assign(this, empire)
	}
	// @PrimaryGeneratedColumn()
	// id: number

	// @PrimaryGeneratedColumn('uuid')
	// uuid: string
	@Index()
	@PrimaryGeneratedColumn()
	empireId: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanId: number

	@ManyToOne(() => User, (user) => user.empires)
	user: User

	// @CreateDateColumn()
	// createdAt: Date

	// @UpdateDateColumn()
	// updatedAt: Date

	@Column({
		type: 'int',
		default: 0,
	})
	clanOldId: number

	@Column({
		type: 'int',
		default: 0,
	})
	attacks: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	bank: number

	@Column({
		type: 'int',
		default: 10,
	})
	bldCash: number

	@Column({
		type: 'int',
		default: 5,
	})
	bldCost: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldDef: number

	@Column({
		type: 'int',
		default: 15,
	})
	bldFood: number

	@Column({
		type: 'int',
		default: 20,
	})
	bldPop: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldTroop: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldWiz: number

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
	defSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	defTotal: number

	@Column({
		type: 'int',
		default: 0,
	})
	era: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	flags: number

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
		default: 200,
	})
	freeLand: number

	@Column({
		type: 'int',
		default: 100,
	})
	health: number

	@Column({
		type: 'int',
		default: 0,
	})
	e_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	idle: number

	@Column({
		type: 'int',
		default: 25,
	})
	indArmy: number

	@Column({
		type: 'int',
		default: 25,
	})
	indFly: number

	@Column({
		type: 'int',
		default: 25,
	})
	indLnd: number

	@Column({
		type: 'int',
		default: 25,
	})
	indSea: number

	@Column({
		type: 'int',
		default: 0,
	})
	killClan: number

	@Column({
		type: 'int',
		default: 0,
	})
	killedBy: number

	@Column({
		type: 'int',
		default: 0,
	})
	kills: number

	@Column({
		type: 'int',
		default: 250,
	})
	land: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	loan: number

	// private market supplies
	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 4000,
	})
	mktArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 2000,
	})
	mktFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100000,
	})
	mktFood: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 3000,
	})
	mktLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 1000,
	})
	mktSea: number

	@Column({
		type: 'int',
		default: 0,
	})
	mktPerArm: number

	@Column({
		type: 'int',
		default: 0,
	})
	mktPerFly: number

	@Column({
		type: 'int',
		default: 0,
	})
	mktPerLnd: number

	@Column({
		type: 'int',
		default: 0,
	})
	mktPerSea: number

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

	@Column({
		type: 'int',
		default: 0,
	})
	offSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	offTotal: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peasants: number

	@Column()
	race: string

	@Column({
		type: 'int',
		default: 0,
	})
	rank: number

	@Column({
		type: 'int',
		default: 0,
	})
	reason: string

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
		default: 0,
	})
	score: number

	@Column({
		type: 'int',
		default: 0,
	})
	sharing: number

	@Column({
		type: 'int',
		default: 0,
	})
	tax: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	trpArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	trpFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	trpLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	trpSea: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
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
	turnsUsed: number

	@Column({
		type: 'int',
		default: 0,
	})
	vacation: number

	@Column({
		type: 'int',
		default: 0,
	})
	valCode: number

	// @Column()
	// turns: number

	// @Column()
	// turnsUsed: number
}
