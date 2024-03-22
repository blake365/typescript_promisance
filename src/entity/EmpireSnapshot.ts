import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'

import Model from './Model'

@Entity('empire snapshots')
export default class EmpireSnapshot extends Model {
	constructor(empire: Partial<EmpireSnapshot>) {
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

	@Column({
		type: 'int',
		default: 0,
	})
	game_id: number

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	lastAction: Date

	@Column({ default: '' })
	mode: string

	@Column({
		type: 'int',
		default: 0,
	})
	attacks: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	bank: number

	@Column({
		type: 'int',
		default: 20,
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
		default: 25,
	})
	bldFood: number

	@Column({
		type: 'int',
		default: 30,
	})
	bldPop: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldTroop: number

	@Column({
		type: 'int',
		default: 10,
	})
	bldWiz: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
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
			from: (value) => Number.parseInt(value),
		},
		default: 10000,
	})
	food: number

	@Column({
		type: 'int',
		default: 160,
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
		default: 250,
	})
	land: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	loan: number

	@Column()
	name: string

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 655360,
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
			from: (value) => Number.parseInt(value),
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
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	runes: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 100,
	})
	trpArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 20,
	})
	trpFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 50,
	})
	trpLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 10,
	})
	trpSea: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
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

	@Column({
		type: 'int',
		default: 0,
	})
	turnsUsed: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	income: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	expenses: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	foodpro: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	foodcon: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	attackGains: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	attackLosses: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	exploreGains: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	indyProd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => Number.parseInt(value),
		},
		default: 0,
	})
	magicProd: number

	// after load, set updatedAt to now
	// @AfterLoad()
	// updateDate() {
	// 	this.updatedAt = new Date()
	// }
}
