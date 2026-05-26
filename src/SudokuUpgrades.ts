import Decimal from 'break_infinity.js'
import { DOMCacheGetOrSet } from './Cache/DOM'
import { Notification } from './UpdateHTML'
import { player } from './Synergism'

export type SudokuUpgradeEffectType = 'boardSpeed' | 'npGain' | 'logRate' | 'solvedBoardGain' | 'autoSubmitUnlock'

interface SudokuUpgradeDefinition {
  id: number
  name: string
  description: string
  cost: Decimal
  effectType: SudokuUpgradeEffectType
  effectValue: number
}

export const SUDOKU_UPGRADES: SudokuUpgradeDefinition[] = [
  { id: 0, name: 'Naked Single Script', description: '+15% board fill speed.', cost: new Decimal(250), effectType: 'boardSpeed', effectValue: 0.15 },
  { id: 1, name: 'Hidden Pair Detector', description: '+25% board fill speed.', cost: new Decimal(1_200), effectType: 'boardSpeed', effectValue: 0.25 },
  { id: 2, name: 'Candidate Cache', description: '+30% Number Points generation.', cost: new Decimal(8_000), effectType: 'npGain', effectValue: 0.30 },
  { id: 3, name: 'Row/Column Auditor', description: 'Solver logs update more frequently.', cost: new Decimal(12_000), effectType: 'logRate', effectValue: 0.25 },
  { id: 4, name: 'Box-Line Reducer', description: '+45% board fill speed.', cost: new Decimal(32_000), effectType: 'boardSpeed', effectValue: 0.45 },
  { id: 5, name: 'X-Wing Engine', description: '+55% Solved Board rewards.', cost: new Decimal(95_000), effectType: 'solvedBoardGain', effectValue: 0.55 },
  { id: 6, name: 'Chain Continuation Daemon', description: '+40% Number Points generation.', cost: new Decimal(240_000), effectType: 'npGain', effectValue: 0.40 },
  { id: 7, name: '3 in the Corner Heuristic', description: '+70% board fill speed.', cost: new Decimal(600_000), effectType: 'boardSpeed', effectValue: 0.70 },
  { id: 8, name: 'Recursive Fish Scanner', description: '+95% Solved Board rewards.', cost: new Decimal(1_800_000), effectType: 'solvedBoardGain', effectValue: 0.95 },
  { id: 9, name: 'Board Submission Auto-Protocol', description: 'Unlock auto board submission and enable toggle.', cost: new Decimal(2_500_000), effectType: 'autoSubmitUnlock', effectValue: 1 }
]

export const hasSudokuUpgrade = (id: number) => player.sudoku.upgrades[id] === 1

export const getSudokuUpgradeMultiplier = (effect: SudokuUpgradeEffectType): number => {
  return SUDOKU_UPGRADES.reduce((total, upgrade) => {
    return hasSudokuUpgrade(upgrade.id) && upgrade.effectType === effect ? total + upgrade.effectValue : total
  }, 0)
}

export const canAffordSudokuUpgrade = (id: number): boolean => player.coins.gte(SUDOKU_UPGRADES[id].cost)

export const isAutoBoardSubmissionUnlocked = (): boolean => hasSudokuUpgrade(9)

export const tryBuySudokuUpgrade = (id: number): boolean => {
  const upgrade = SUDOKU_UPGRADES[id]
  if (!upgrade || hasSudokuUpgrade(id) || !canAffordSudokuUpgrade(id)) return false

  player.coins = player.coins.sub(upgrade.cost)
  player.coinsThisPrestige = player.coinsThisPrestige.sub(upgrade.cost)
  player.sudoku.upgrades[id] = 1

  if (upgrade.effectType === 'autoSubmitUnlock') {
    player.sudoku.autoBoardSubmission = true
    pushSudokuLog('Board Submission Auto-Protocol unlocked. Automatic routing enabled.')
  } else if (id === 7) {
    pushSudokuLog('Corner note detected: 3. Confidence increased by irrational margins.')
  } else if (upgrade.effectType === 'solvedBoardGain') {
    pushSudokuLog(`${upgrade.name} installed. Board valuation coefficients updated.`)
  }

  Notification(`${upgrade.name} purchased for ${upgrade.cost.toString()} NP!`, 3500)
  return true
}

export const toggleAutoBoardSubmission = () => {
  if (!isAutoBoardSubmissionUnlocked()) return
  player.sudoku.autoBoardSubmission = !player.sudoku.autoBoardSubmission
  pushSudokuLog(player.sudoku.autoBoardSubmission
    ? 'Auto Board Submission enabled. The queue moves without supervision.'
    : 'Auto Board Submission disabled. Manual confirmations restored.')
}

export const pushSudokuLog = (entry: string) => {
  if (player.sudoku.log.length > 120) player.sudoku.log.shift()
  player.sudoku.log.push(entry)
}

export const updateSudokuUpgradeUI = () => {
  SUDOKU_UPGRADES.forEach((upgrade) => {
    const button = DOMCacheGetOrSet(`sudokuUpgradeBtn${upgrade.id}`)
    const owned = hasSudokuUpgrade(upgrade.id)
    const affordable = canAffordSudokuUpgrade(upgrade.id)
    const status = owned ? 'Purchased' : affordable ? 'Buy' : 'Insufficient NP'
    button.textContent = `${upgrade.name} — ${upgrade.cost.toString()} NP [${status}]`
    button.classList.toggle('sudokuUpgradeOwned', owned)
    button.classList.toggle('sudokuUpgradeLocked', !owned && !affordable)
    ;(button as HTMLButtonElement).disabled = owned || (!affordable && !owned)
  })

  const autoToggle = DOMCacheGetOrSet('sudokuAutoSubmissionToggle') as HTMLButtonElement
  const unlocked = isAutoBoardSubmissionUnlocked()
  autoToggle.disabled = !unlocked
  autoToggle.textContent = unlocked
    ? `Auto Board Submission: ${player.sudoku.autoBoardSubmission ? 'ON' : 'OFF'}`
    : 'Auto Board Submission: Locked'
}
