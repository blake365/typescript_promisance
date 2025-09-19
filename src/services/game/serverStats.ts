import { getRepository } from 'typeorm'
import Empire from '../../entity/Empire'
import Game from '../../entity/Game'

export interface ServerStatistics {
	medianNetworth: number
	averageNetworth: number
	totalActivePlayers: number
	averageMilitarySize: number
	topPlayerNetworth: number
	dayOfRound: number
	lastUpdated: Date
}

// Cache server stats for performance
const statsCache = new Map<number, ServerStatistics>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function getServerStats(gameId: number): Promise<ServerStatistics> {
	// Check cache first
	const cached = statsCache.get(gameId)
	if (cached && (Date.now() - cached.lastUpdated.getTime() < CACHE_DURATION)) {
		return cached
	}

	// Calculate fresh stats
	const stats = await calculateServerStats(gameId)
	statsCache.set(gameId, stats)
	return stats
}

async function calculateServerStats(gameId: number): Promise<ServerStatistics> {
	const game = await Game.findOne({ game_id: gameId })
	if (!game) {
		throw new Error(`Game ${gameId} not found`)
	}

	// Get all active empires
	const empires = await getRepository(Empire)
		.createQueryBuilder('empire')
		.where('empire.game_id = :gameId', { gameId })
		.andWhere('empire.turnsUsed > 0')
		.andWhere('empire.mode != :mode', { mode: 'demo' })
		.orderBy('empire.networth', 'DESC')
		.getMany()

	if (empires.length === 0) {
		return {
			medianNetworth: 10000000,
			averageNetworth: 10000000,
			totalActivePlayers: 0,
			averageMilitarySize: 0,
			topPlayerNetworth: 10000000,
			dayOfRound: 0,
			lastUpdated: new Date()
		}
	}

	// Calculate median networth
	const sortedNetworths = empires.map(e => e.networth)
	const mid = Math.floor(sortedNetworths.length / 2)
	const medianNetworth = sortedNetworths.length % 2 !== 0
		? sortedNetworths[mid]
		: (sortedNetworths[mid - 1] + sortedNetworths[mid]) / 2

	// Calculate average networth
	const totalNetworth = empires.reduce((sum, e) => sum + e.networth, 0)
	const averageNetworth = totalNetworth / empires.length

	// Calculate average military size
	const totalMilitary = empires.reduce((sum, e) => {
		return sum + e.trpArm + e.trpLnd + e.trpFly + e.trpSea
	}, 0)
	const averageMilitarySize = totalMilitary / empires.length

	// Calculate day of round
	const roundStartDate = new Date(game.roundStart).getTime()
	const now = new Date().getTime()
	const dayOfRound = Math.floor((now - roundStartDate) / (1000 * 60 * 60 * 24))

	return {
		medianNetworth: Math.max(medianNetworth, 1000000), // Min 1M to avoid divide by zero
		averageNetworth,
		totalActivePlayers: empires.length,
		averageMilitarySize,
		topPlayerNetworth: sortedNetworths[0] || 10000000,
		dayOfRound: Math.max(0, Math.min(30, dayOfRound)), // Clamp to 0-30
		lastUpdated: new Date()
	}
}

// Update stats during turn processing
export async function updateServerStats(gameId: number): Promise<void> {
	const stats = await calculateServerStats(gameId)
	statsCache.set(gameId, stats)
}

// Get military distribution for balancing
export async function getMilitaryDistribution(gameId: number) {
	const empires = await getRepository(Empire)
		.createQueryBuilder('empire')
		.where('empire.game_id = :gameId', { gameId })
		.andWhere('empire.turnsUsed > 0')
		.andWhere('empire.mode != :mode', { mode: 'demo' })
		.getMany()

	if (empires.length === 0) {
		return {
			armPercent: 0.25,
			lndPercent: 0.25,
			flyPercent: 0.25,
			seaPercent: 0.25
		}
	}

	const totalArm = empires.reduce((sum, e) => sum + e.trpArm, 0)
	const totalLnd = empires.reduce((sum, e) => sum + e.trpLnd, 0)
	const totalFly = empires.reduce((sum, e) => sum + e.trpFly, 0)
	const totalSea = empires.reduce((sum, e) => sum + e.trpSea, 0)
	const totalTroops = totalArm + totalLnd + totalFly + totalSea

	if (totalTroops === 0) {
		return {
			armPercent: 0.25,
			lndPercent: 0.25,
			flyPercent: 0.25,
			seaPercent: 0.25
		}
	}

	return {
		armPercent: totalArm / totalTroops,
		lndPercent: totalLnd / totalTroops,
		flyPercent: totalFly / totalTroops,
		seaPercent: totalSea / totalTroops
	}
}

// Clear cache (call when round resets)
export function clearStatsCache(gameId?: number): void {
	if (gameId) {
		statsCache.delete(gameId)
	} else {
		statsCache.clear()
	}
}