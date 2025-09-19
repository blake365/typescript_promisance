# NeoPromisance Game Balance Analysis & Recommendations

## Executive Summary

This document provides a comprehensive analysis of game balance issues in NeoPromisance, a month-long competitive turn-based strategy game. The core problems identified are:

1. **Exponential snowballing** via the size bonus mechanic (0.5-1.7x multiplier)
2. **Week 2 winner determination** - games effectively decided by day 7-10
3. **Lack of comeback mechanics** for players who fall behind
4. **Griefing vulnerabilities** where high networth players can devastate smaller ones
5. **Mid-round stagnation** after initial growth phase

## Current Mechanics Analysis

### The Size Bonus Problem

The current size bonus formula creates a 3.4x production differential:
```typescript
// src/services/actions/actions.ts:19-23
export const calcSizeBonus = ({ networth }) => {
  let net = Math.max(networth, 1)
  let size = Math.atan(generalLog(net, 10000) - 1.3) * 2.6 - 0.6
  size = Math.round(Math.min(Math.max(0.5, size), 1.7) * 1000) / 1000
  return size
}
```

**Impact**: A player at 100M networth produces 3.4x more resources per turn than a player at 1M networth, making catch-up mathematically impossible.

### Resource Production Imbalance

- **Cash Buildings**: Linear scaling with NO diminishing returns
  - Formula: `bldCash * 550 * max(0.8, size * 1.25)`
- **Food Buildings**: Harsh diminishing returns
  - Formula: `bldFood * 70 * sqrt(1 - 0.75 * bldFood/land)`
  - At 50% land coverage, efficiency drops to ~35%

**Result**: Cash-focused strategies dominate, reducing strategic diversity.

### Attack & Griefing Issues

Current attack mechanics allow:
- Up to 10% of defender's land captured per attack
- No penalties for attacking much smaller players
- 30 attacks per player = potential 96% land loss in one day

### Upkeep Triviality

Current upkeep costs per unit:
- Army: 0.13 cash/turn
- Land: 0.5 cash/turn
- Air: 1.5 cash/turn
- Sea: 3.0 cash/turn

**Problem**: One cash building (550 income) can support 4,230 army units. No meaningful constraint on military size.

## Proposed Solutions

### Priority 1: Immediate Anti-Snowball Fixes

#### A. Invert Size Bonus for Comeback Mechanics

Replace the current exponential advantage with a rubber-band system:

```typescript
export const calcSizeBonus = ({ networth }, medianNetworth?: number) => {
  if (!medianNetworth) medianNetworth = 10000000

  const ratio = networth / medianNetworth
  let size = 1.0

  if (ratio < 0.5) {
    size = 1.3  // 30% bonus for bottom players
  } else if (ratio < 0.8) {
    size = 1.15 // 15% bonus for below-average
  } else if (ratio < 1.2) {
    size = 1.0  // Neutral for average players
  } else if (ratio < 2.0) {
    size = 0.9  // 10% penalty for leaders
  } else {
    size = 0.75 // 25% penalty for dominant leaders
  }

  return Math.round(size * 1000) / 1000
}
```

**Impact**: Creates natural catch-up mechanics and prevents runaway leaders.

#### B. Progressive Attack Penalties

Penalize attacks on much smaller players:

```typescript
const networthRatio = attacker.networth / Math.max(1, defender.networth)
let efficiency = 1.0

if (networthRatio > 2.0) {
  efficiency = 0.3  // 70% penalty for 2x size difference
} else if (networthRatio > 1.5) {
  efficiency = 0.5
} else if (networthRatio > 1.2) {
  efficiency = 0.75
} else if (networthRatio < 0.5) {
  efficiency = 1.5  // Bonus for underdog attacks
}
```

### Priority 2: Week-Based Progression System

Different mechanics for each week of the month:

```typescript
const gameWeek = Math.floor(gameDay / 7) + 1

switch(gameWeek) {
  case 1: // Establishment (Days 1-7)
    attackLimit = 10        // Reduced attacks
    turnBonus = normal      // Standard turns
    break

  case 2: // Expansion (Days 8-14)
    attackLimit = 30        // Normal attacks
    turnBonus = +1          // Extra turn per cycle
    break

  case 3: // Conflict (Days 15-21)
    attackLimit = 40        // Extra attacks for comebacks
    turnBonus = normal
    break

  case 4: // Endgame (Days 22-30)
    attackLimit = 50        // Chaos mode
    turnBonus = +2          // Accelerated pace
    break
}
```

### Priority 3: Economic Rebalancing

#### A. Universal Soft Caps

Apply diminishing returns to ALL resource production:

```typescript
// Cash production with soft DR
const cashRatio = empire.bldCash / Math.max(empire.land, 1)
const cashEfficiency = 1 / (1 + cashRatio * 0.3)
income = bldCash * 550 * cashEfficiency * size

// Soften food DR (change 0.75 to 0.4)
foodPro = bldFood * 70 * sqrt(1 - 0.4 * bldFood/land)
```

#### B. Progressive Upkeep

Make large armies economically challenging:

```typescript
const troopCount = empire.trpArm + empire.trpLnd*2 + empire.trpFly*4 + empire.trpSea*6
const weekMultiplier = 1 + (gameWeek * 0.25)

expenses = (
  empire.trpArm * 0.2 +
  empire.trpLnd * 0.75 +
  empire.trpFly * 2.0 +
  empire.trpSea * 4.0
) * weekMultiplier + empire.land * (3.2 + gameWeek)
```

### Priority 4: Protection & Recovery

#### A. Bounce-Back Shield

Auto-protection for devastated empires:

```typescript
if (defender.land < defender.peakLand * 0.7) {
  defender.protection = 6 * HOURS  // Temporary shield
  defender.recoveryBonus = 1.5     // 50% production boost
}
```

#### B. Diminishing Returns on Same Target

Reduce effectiveness of repeated attacks:

```typescript
const recentAttacks = getRecentAttacks(attacker, defender, 24hrs)
const effectiveness = Math.pow(0.8, recentAttacks) // -20% per attack
```

### Priority 5: Victory Condition Evolution

Replace pure networth with momentum-based scoring:

```typescript
const calculateDailyScore = (empire, rank) => {
  let score = 0

  // Position points
  if (rank === 1) score += 1000
  else if (rank <= 3) score += 500
  else if (rank <= 10) score += 200

  // Growth points (reward improvement, not size)
  const growthRate = (empire.networth - empire.yesterdayNetworth) / empire.yesterdayNetworth
  score += Math.floor(growthRate * 10000)

  // Activity bonus
  if (empire.turnsUsed > 50) score += 100
  if (empire.attacks > 0) score += 50

  return score
}
```

## Implementation Roadmap

### Week 1: Core Fixes
- [ ] Invert size bonus formula
- [ ] Implement attack networth penalties
- [ ] Add median networth tracking to turn processing
- [ ] Test on development server

### Week 2: Engagement Systems
- [ ] Add week-based progression mechanics
- [ ] Implement bounce-back protection
- [ ] Create diminishing returns for repeat attacks
- [ ] Deploy to beta server

### Week 3: Economic Tuning
- [ ] Add soft caps to all resource production
- [ ] Implement progressive military upkeep
- [ ] Adjust building costs for late-game
- [ ] Balance based on Week 1-2 data

### Week 4: Victory Evolution
- [ ] Implement momentum-based scoring system
- [ ] Add daily challenge system
- [ ] Create end-of-round bonuses
- [ ] Full production deployment

## Risk Analysis

### Technical Risks
1. **Database Migration**: New columns needed for underdog bonus, protection status, daily scores
2. **Performance**: Additional calculations in turn processing may impact server load
3. **Backwards Compatibility**: Ensure changes don't break existing game rounds

### Player Impact Risks
1. **Strategy Disruption**: Existing strategies will become obsolete
2. **Learning Curve**: Players need to understand new mechanics
3. **Community Reaction**: Some players may resist fundamental changes

### Mitigation Strategies
1. **Phased Rollout**: Test each change independently
2. **Clear Communication**: Detailed patch notes explaining rationale
3. **Rollback Plan**: Keep ability to revert if critical issues arise
4. **Beta Testing**: Run parallel beta rounds before full deployment

## Metrics for Success

### Short-term (1 month)
- Reduce winner determination from Day 7 to Day 21+
- Decrease top player networth from 10x median to 3x median
- Increase daily active players in week 3-4 by 50%

### Medium-term (3 months)
- Increase player retention by 30%
- Achieve 3+ viable meta strategies (not just cash rush)
- Reduce griefing complaints by 75%

### Long-term (6 months)
- Establish consistent 100+ active players per round
- Create competitive tournament scene
- Build reputation as balanced competitive game

## Alternative Approaches Considered

### Approach 1: Hard Caps
- **Pros**: Simple to implement, guarantees balance
- **Cons**: Feels artificial, limits player agency
- **Decision**: Rejected in favor of soft caps

### Approach 2: Complete Economic Redesign
- **Pros**: Could solve all issues at once
- **Cons**: Too disruptive, high risk of failure
- **Decision**: Rejected in favor of incremental changes

### Approach 3: Shorter Rounds (2 weeks)
- **Pros**: Less time for snowballing
- **Cons**: Doesn't address core balance issues
- **Decision**: Rejected as avoiding the problem

## Conclusion

The current game mechanics create an exponentially widening gap between leaders and followers, resulting in predetermined outcomes by week 2 of a 4-week round. The proposed changes address this through:

1. **Inverting advantages** - helping trailing players catch up
2. **Progressive penalties** - constraining runaway leaders
3. **Phase-based gameplay** - keeping each week fresh and competitive
4. **Protection mechanics** - preventing griefing and enabling recovery

The most critical change is inverting the size bonus formula. This single modification will extend the competitive window from 7 days to 20+ days, dramatically improving player retention and engagement.

## Appendix: Key Formulas

### Current State
- Size Bonus: `0.5x to 1.7x` based on networth
- Cash Production: `bldCash * 550 * size * 1.25`
- Food Production: `bldFood * 70 * sqrt(1 - 0.75 * ratio)`
- Attack Land Gain: Up to 10% of defender's land
- Upkeep: Negligible (0.13 to 3.0 per unit)

### Proposed State
- Size Bonus: `0.75x to 1.3x` inversely based on rank
- Cash Production: `bldCash * 550 * efficiency * size`
- Food Production: `bldFood * 70 * sqrt(1 - 0.4 * ratio)`
- Attack Land Gain: Modified by networth ratio (0.3x to 1.5x)
- Upkeep: Progressive based on army size and game week

## Next Steps

1. Review this analysis with the development team
2. Create test scenarios for each proposed change
3. Set up A/B testing infrastructure for beta rounds
4. Prepare community communication plan
5. Begin implementation of Priority 1 changes

---

*Document prepared: [Current Date]*
*Version: 1.0*
*Status: Draft for Review*