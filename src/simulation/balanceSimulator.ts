// Balance Testing Simulator for NeoPromisance
// Tests the impact of various balance changes on game progression

interface SimulatedEmpire {
  id: number
  name: string
  strategy: 'explorer' | 'farmer' | 'casher' | 'attacker' | 'balanced'

  // Resources
  land: number
  freeLand: number
  cash: number
  food: number
  networth: number

  // Military
  trpArm: number
  trpLnd: number
  trpFly: number
  trpSea: number

  // Buildings
  bldCash: number
  bldFood: number
  bldTroop: number

  // Stats
  turnsUsed: number
  exploreCount: number
  attacksMade: number
  attacksReceived: number
  daysOutOfProtection: number
}

interface SimulationConfig {
  // Game parameters
  numPlayers: number
  roundDays: number
  turnsPerDay: number
  protectionTurns: number

  // Balance parameters
  landCoefficient: number  // 0.00008 (old) vs 0.00016 (new)
  useSizeFactors: boolean
  militaryUpkeepBase: number
  foodConsumptionMultiplier: number

  // Strategy distribution (must sum to numPlayers)
  strategies: {
    explorer: number
    farmer: number
    casher: number
    attacker: number
    balanced: number
  }
}

class BalanceSimulator {
  private empires: SimulatedEmpire[] = []
  private day: number = 0
  private config: SimulationConfig
  private metrics: {
    dayNumber: number[]
    totalLand: number[]
    medianNetworth: number[]
    topNetworth: number[]
    bottomNetworth: number[]
    giniCoefficient: number[]
    totalAttacks: number[]
    avgTroops: number[]
  } = {
    dayNumber: [],
    totalLand: [],
    medianNetworth: [],
    topNetworth: [],
    bottomNetworth: [],
    giniCoefficient: [],
    totalAttacks: [],
    avgTroops: []
  }

  constructor(config: SimulationConfig) {
    this.config = config
    this.initializeEmpires()
  }

  private initializeEmpires() {
    let empireId = 0

    // Create empires with each strategy
    const strategies = Object.entries(this.config.strategies)
    for (const [strategy, count] of strategies) {
      for (let i = 0; i < count; i++) {
        this.empires.push({
          id: empireId++,
          name: `${strategy}_${i}`,
          strategy: strategy as any,
          land: 1000,
          freeLand: 1000,
          cash: 100000,
          food: 50000,
          networth: 100000,
          trpArm: 100,
          trpLnd: 0,
          trpFly: 0,
          trpSea: 0,
          bldCash: 0,
          bldFood: 0,
          bldTroop: 0,
          turnsUsed: 0,
          exploreCount: 0,
          attacksMade: 0,
          attacksReceived: 0,
          daysOutOfProtection: 0
        })
      }
    }
  }

  private calculateExploration(empire: SimulatedEmpire): number {
    // Using the actual game formula
    const baseExplore = (1 / (empire.land * this.config.landCoefficient + 1)) * 100

    // Apply size factors if enabled
    if (this.config.useSizeFactors && empire.networth > 0) {
      const medianNW = this.getMedianNetworth()
      const ratio = empire.networth / medianNW

      // Apply expansion difficulty
      let expansionDifficulty = 1.0
      if (ratio > 3.0) expansionDifficulty = 1.5
      else if (ratio > 1.5) expansionDifficulty = 1.2

      return baseExplore / expansionDifficulty
    }

    return baseExplore
  }

  private calculateProduction(empire: SimulatedEmpire) {
    const medianNW = this.getMedianNetworth()
    const ratio = empire.networth / medianNW

    // Economic efficiency from size factors
    let economicEfficiency = 1.0
    if (this.config.useSizeFactors) {
      if (ratio < 0.5) economicEfficiency = 1.15
      else if (ratio < 0.8) economicEfficiency = 1.05
      else if (ratio < 1.5) economicEfficiency = 1.0
      else if (ratio < 3.0) economicEfficiency = 0.95
      else economicEfficiency = 0.9
    } else {
      // Old size bonus
      const size = Math.min(Math.max(0.5, ratio * 0.6), 1.7)
      economicEfficiency = size * 1.25
    }

    // Cash production
    const cashPro = empire.bldCash * 550 * economicEfficiency

    // Food production with diminishing returns
    const foodDiminish = Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1))
    const foodPro = empire.bldFood * 70 * foodDiminish * economicEfficiency

    // Food consumption
    const foodCon = (
      empire.trpArm * 0.011 +   // New reduced consumption
      empire.trpLnd * 0.016 +
      empire.trpFly * 0.022 +
      empire.trpSea * 0.016
    ) * this.config.foodConsumptionMultiplier

    // Military upkeep
    const totalTroops = empire.trpArm + empire.trpLnd + empire.trpFly + empire.trpSea
    const troopDensity = totalTroops / Math.max(empire.land, 1)
    let densityMultiplier = 1.0

    if (this.config.useSizeFactors && troopDensity > 15) {
      densityMultiplier = 1.0 + (troopDensity - 15) * 0.01
    }

    const militaryUpkeep = (
      empire.trpArm * 0.25 +
      empire.trpLnd * 1.0 +
      empire.trpFly * 3.0 +
      empire.trpSea * 6.0
    ) * this.config.militaryUpkeepBase * densityMultiplier

    empire.cash += Math.round(cashPro - militaryUpkeep - empire.land * 3)
    empire.food += Math.round(foodPro - foodCon)

    // Handle starvation
    if (empire.food < 0) {
      empire.food = 0
      // Troops desert
      empire.trpArm = Math.floor(empire.trpArm * 0.95)
    }

    if (empire.cash < 0) {
      empire.cash = 0
      // Can't maintain military
      empire.trpArm = Math.floor(empire.trpArm * 0.98)
    }
  }

  private executeStrategy(empire: SimulatedEmpire) {
    const turnsToUse = this.config.turnsPerDay
    const isProtected = empire.turnsUsed < this.config.protectionTurns

    if (!isProtected) {
      empire.daysOutOfProtection++
    }

    switch (empire.strategy) {
      case 'explorer':
        // Focus on exploration
        for (let i = 0; i < turnsToUse; i++) {
          const landGained = this.calculateExploration(empire)
          empire.land += landGained
          empire.freeLand += landGained
          empire.exploreCount++
        }
        break

      case 'farmer':
        // Build food production
        if (empire.freeLand > 100) {
          const toBuild = Math.min(50, empire.freeLand)
          empire.bldFood += toBuild
          empire.freeLand -= toBuild
        } else {
          // Explore for more land
          for (let i = 0; i < turnsToUse / 2; i++) {
            const landGained = this.calculateExploration(empire)
            empire.land += landGained
            empire.freeLand += landGained
          }
        }
        break

      case 'casher':
        // Build cash production
        if (empire.freeLand > 100) {
          const toBuild = Math.min(50, empire.freeLand)
          empire.bldCash += toBuild
          empire.freeLand -= toBuild
        } else {
          for (let i = 0; i < turnsToUse / 2; i++) {
            const landGained = this.calculateExploration(empire)
            empire.land += landGained
            empire.freeLand += landGained
          }
        }
        break

      case 'attacker':
        // Build troops and attack aggressively
        if (empire.daysOutOfProtection < 2) {
          // Early game: build barracks and some farms/cashers
          if (empire.freeLand > 100) {
            empire.bldTroop += Math.min(40, empire.freeLand * 0.5)
            empire.bldCash += Math.min(20, empire.freeLand * 0.25)
            empire.bldFood += Math.min(20, empire.freeLand * 0.25)
            empire.freeLand -= Math.min(80, empire.freeLand)
          } else {
            // Need more land to build
            for (let i = 0; i < turnsToUse / 2; i++) {
              const landGained = this.calculateExploration(empire)
              empire.land += landGained
              empire.freeLand += landGained
            }
          }
        } else if (!isProtected) {
          // Attack phase - use ALL turns for attacks if possible
          const targets = this.empires.filter(e =>
            e.id !== empire.id &&
            e.turnsUsed >= this.config.protectionTurns &&
            e.land > empire.land * 0.3  // Attack anyone with 30%+ of our land
          ).sort((a, b) => {
            // Prioritize rich, weak targets
            const aDefense = a.trpArm + a.trpLnd * 2
            const bDefense = b.trpArm + b.trpLnd * 2
            const aValue = a.land / Math.max(aDefense, 100)
            const bValue = b.land / Math.max(bDefense, 100)
            return bValue - aValue  // Higher value = better target
          })

          // Use most turns for attacks (leave some for building)
          const attackTurns = Math.floor(turnsToUse * 0.7)
          let attacksThisTurn = 0

          for (let i = 0; i < attackTurns && targets.length > 0; i++) {
            if (empire.trpArm > 500) {  // Minimum troops to attack
              // Pick best target
              const target = targets[0]
              const success = this.processAttack(empire, target)
              attacksThisTurn++

              // If we failed, maybe try next target
              if (!success && targets.length > 1) {
                targets.shift()  // Remove failed target, try next
              }

              // Break if we're out of troops
              if (empire.trpArm < 500) break
            } else {
              break  // Not enough troops
            }
          }

          // Use remaining turns to rebuild
          if (empire.freeLand > 50) {
            empire.bldTroop += Math.min(20, empire.freeLand * 0.7)
            empire.bldCash += Math.min(10, empire.freeLand * 0.3)
            empire.freeLand -= Math.min(30, empire.freeLand)
          }
        }

        // Industry production (simplified - assuming 100% to trpArm)
        // Base rate is 1.2 per barracks with indMultiplier = 1
        empire.trpArm += Math.floor(empire.bldTroop * 1.2)
        break

      case 'balanced':
        // Mix of everything
        const third = Math.floor(turnsToUse / 3)

        // Explore
        for (let i = 0; i < third; i++) {
          const landGained = this.calculateExploration(empire)
          empire.land += landGained
          empire.freeLand += landGained
        }

        // Build
        if (empire.freeLand > 50) {
          empire.bldCash += Math.min(20, empire.freeLand / 3)
          empire.bldFood += Math.min(20, empire.freeLand / 3)
          empire.bldTroop += Math.min(10, empire.freeLand / 3)
          empire.freeLand -= Math.min(50, empire.freeLand)
        }

        // Produce troops (half rate for balanced strategy)
        empire.trpArm += Math.floor(empire.bldTroop * 0.6)
        break
    }

    empire.turnsUsed += turnsToUse
  }

  private processAttack(attacker: SimulatedEmpire, defender: SimulatedEmpire): boolean {
    // Simple combat resolution
    const attackPower = attacker.trpArm + attacker.trpLnd * 2 + attacker.trpFly * 3
    const defensePower = defender.trpArm + defender.trpLnd * 2

    if (attackPower > defensePower * 1.5) {
      // Successful attack
      const landStolen = Math.floor(defender.land * 0.07)
      const buildingsStolen = Math.floor(landStolen * 0.7)

      attacker.land += landStolen
      attacker.freeLand += landStolen - buildingsStolen
      defender.land -= landStolen

      // Distribute stolen buildings
      if (defender.bldCash > 0) {
        const stolen = Math.min(defender.bldCash, buildingsStolen / 3)
        attacker.bldCash += stolen
        defender.bldCash -= stolen
      }

      // Military losses
      attacker.trpArm = Math.floor(attacker.trpArm * 0.95)
      defender.trpArm = Math.floor(defender.trpArm * 0.85)

      attacker.attacksMade++
      defender.attacksReceived++
      return true
    }

    // Failed attack - attacker loses more
    attacker.trpArm = Math.floor(attacker.trpArm * 0.85)
    defender.trpArm = Math.floor(defender.trpArm * 0.95)
    return false
  }

  private calculateNetworth(empire: SimulatedEmpire) {
    // Using actual game networth calculation
    // Default pvtm values from Game.ts:
    const pvtmTrpArm = 500
    const pvtmTrpLnd = 1000
    const pvtmTrpFly = 2000
    const pvtmTrpSea = 3000
    const pvtmFood = 10

    empire.networth =
      empire.land * 250 +           // land value
      empire.freeLand * 100 +        // free land value
      empire.cash / (5 * pvtmTrpArm) +  // cash value (ignoring bank/loan for simplicity)
      empire.food * (pvtmFood / pvtmTrpArm) +  // food value
      empire.trpArm * 1 +            // base troop value
      (empire.trpLnd * pvtmTrpLnd) / pvtmTrpArm +  // = 2x
      (empire.trpFly * pvtmTrpFly) / pvtmTrpArm +  // = 4x
      (empire.trpSea * pvtmTrpSea) / pvtmTrpArm +  // = 6x
      (empire.bldCash + empire.bldFood + empire.bldTroop) * 500  // buildings worth ~500 each based on land value
  }

  private getMedianNetworth(): number {
    const sorted = [...this.empires].sort((a, b) => a.networth - b.networth)
    return sorted[Math.floor(sorted.length / 2)].networth
  }

  private calculateGiniCoefficient(): number {
    const n = this.empires.length
    const sorted = [...this.empires].sort((a, b) => a.networth - b.networth)

    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * sorted[i].networth
    }

    const totalNetworth = sorted.reduce((a, b) => a + b.networth, 0)
    return sum / (n * totalNetworth)
  }

  private collectMetrics() {
    // Update networths
    this.empires.forEach(e => this.calculateNetworth(e))

    // Sort by networth
    const sorted = [...this.empires].sort((a, b) => b.networth - a.networth)

    // Collect metrics
    this.metrics.dayNumber.push(this.day)
    this.metrics.totalLand.push(this.empires.reduce((a, b) => a + b.land, 0))
    this.metrics.medianNetworth.push(this.getMedianNetworth())
    this.metrics.topNetworth.push(sorted[0].networth)
    this.metrics.bottomNetworth.push(sorted[sorted.length - 1].networth)
    this.metrics.giniCoefficient.push(this.calculateGiniCoefficient())
    this.metrics.totalAttacks.push(this.empires.reduce((a, b) => a + b.attacksMade, 0))

    const totalTroops = this.empires.reduce((a, b) =>
      a + b.trpArm + b.trpLnd + b.trpFly + b.trpSea, 0)
    this.metrics.avgTroops.push(totalTroops / this.empires.length)
  }

  public simulateRound() {
    console.log('Starting simulation with config:', this.config)

    for (this.day = 1; this.day <= this.config.roundDays; this.day++) {
      // Each empire executes their strategy
      this.empires.forEach(empire => {
        this.executeStrategy(empire)
        this.calculateProduction(empire)
      })

      // Collect metrics for this day
      this.collectMetrics()

      // Log progress every 5 days
      if (this.day % 5 === 0) {
        const topBottom = this.metrics.topNetworth[this.day - 1] /
                         this.metrics.bottomNetworth[this.day - 1]
        console.log(`Day ${this.day}: Total Land: ${this.metrics.totalLand[this.day - 1]}, ` +
                   `Top/Bottom Ratio: ${topBottom.toFixed(2)}, ` +
                   `Gini: ${this.metrics.giniCoefficient[this.day - 1].toFixed(3)}`)
      }
    }

    return this.generateReport()
  }

  private generateReport() {
    const finalDay = this.metrics.dayNumber.length - 1

    return {
      config: this.config,
      finalMetrics: {
        totalLand: this.metrics.totalLand[finalDay],
        medianNetworth: this.metrics.medianNetworth[finalDay],
        topNetworth: this.metrics.topNetworth[finalDay],
        bottomNetworth: this.metrics.bottomNetworth[finalDay],
        topBottomRatio: this.metrics.topNetworth[finalDay] / this.metrics.bottomNetworth[finalDay],
        giniCoefficient: this.metrics.giniCoefficient[finalDay],
        totalAttacks: this.metrics.totalAttacks[finalDay],
        avgTroops: this.metrics.avgTroops[finalDay]
      },
      progression: this.metrics,
      topEmpires: [...this.empires]
        .sort((a, b) => b.networth - a.networth)
        .slice(0, 5)
        .map(e => ({
          name: e.name,
          strategy: e.strategy,
          networth: e.networth,
          land: e.land,
          troops: e.trpArm + e.trpLnd + e.trpFly + e.trpSea
        }))
    }
  }
}

// Run simulations comparing old vs new balance
function compareBalanceSystems() {
  console.log('=== OLD BALANCE SYSTEM ===')
  const oldSystem = new BalanceSimulator({
    numPlayers: 20,
    roundDays: 30,
    turnsPerDay: 50,
    protectionTurns: 200,
    landCoefficient: 0.00008,  // Old exploration rate
    useSizeFactors: false,      // Old size bonus system
    militaryUpkeepBase: 1.0,    // Original upkeep
    foodConsumptionMultiplier: 1.53,  // Original food consumption (1/0.65)
    strategies: {
      explorer: 4,
      farmer: 4,
      casher: 4,
      attacker: 4,
      balanced: 4
    }
  })
  const oldResults = oldSystem.simulateRound()

  console.log('\n=== NEW BALANCE SYSTEM ===')
  const newSystem = new BalanceSimulator({
    numPlayers: 20,
    roundDays: 30,
    turnsPerDay: 50,
    protectionTurns: 200,
    landCoefficient: 0.00016,  // New exploration rate (50% reduction)
    useSizeFactors: true,       // New multi-factor size system
    militaryUpkeepBase: 1.5,    // Increased base upkeep
    foodConsumptionMultiplier: 1.0,  // Reduced food consumption
    strategies: {
      explorer: 4,
      farmer: 4,
      casher: 4,
      attacker: 4,
      balanced: 4
    }
  })
  const newResults = newSystem.simulateRound()

  // Compare results
  console.log('\n=== COMPARISON ===')
  console.log('Metric                | Old System    | New System    | Change')
  console.log('--------------------- | ------------- | ------------- | -------')
  console.log(`Total Land            | ${oldResults.finalMetrics.totalLand.toLocaleString().padEnd(13)} | ${newResults.finalMetrics.totalLand.toLocaleString().padEnd(13)} | ${((newResults.finalMetrics.totalLand / oldResults.finalMetrics.totalLand - 1) * 100).toFixed(1)}%`)
  console.log(`Top/Bottom Ratio      | ${oldResults.finalMetrics.topBottomRatio.toFixed(2).padEnd(13)} | ${newResults.finalMetrics.topBottomRatio.toFixed(2).padEnd(13)} | ${((newResults.finalMetrics.topBottomRatio / oldResults.finalMetrics.topBottomRatio - 1) * 100).toFixed(1)}%`)
  console.log(`Gini Coefficient      | ${oldResults.finalMetrics.giniCoefficient.toFixed(3).padEnd(13)} | ${newResults.finalMetrics.giniCoefficient.toFixed(3).padEnd(13)} | ${((newResults.finalMetrics.giniCoefficient / oldResults.finalMetrics.giniCoefficient - 1) * 100).toFixed(1)}%`)
  console.log(`Total Attacks         | ${oldResults.finalMetrics.totalAttacks.toString().padEnd(13)} | ${newResults.finalMetrics.totalAttacks.toString().padEnd(13)} | ${((newResults.finalMetrics.totalAttacks / oldResults.finalMetrics.totalAttacks - 1) * 100).toFixed(1)}%`)
  console.log(`Avg Troops            | ${Math.round(oldResults.finalMetrics.avgTroops).toLocaleString().padEnd(13)} | ${Math.round(newResults.finalMetrics.avgTroops).toLocaleString().padEnd(13)} | ${((newResults.finalMetrics.avgTroops / oldResults.finalMetrics.avgTroops - 1) * 100).toFixed(1)}%`)

  console.log('\n=== TOP 5 EMPIRES (NEW SYSTEM) ===')
  newResults.topEmpires.forEach((e, i) => {
    console.log(`${i + 1}. ${e.name} (${e.strategy}): ${e.networth.toLocaleString()} NW, ${e.land.toLocaleString()} land, ${e.troops.toLocaleString()} troops`)
  })

  return { oldResults, newResults }
}

// Export for use in other scripts
export { BalanceSimulator, compareBalanceSystems }

// Run if executed directly
if (require.main === module) {
  compareBalanceSystems()
}