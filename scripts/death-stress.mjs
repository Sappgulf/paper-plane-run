import {
  buildDeathStressReport,
  DEFAULT_DEATH_STRESS_SEED_COUNT,
  DEFAULT_DEATH_STRESS_SEED_START,
} from '../src/game/death-stress.js'

function cliNumber(name, fallback) {
  const prefix = `--${name}=`
  const value = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
  return value == null ? fallback : Number(value)
}

const report = buildDeathStressReport({
  seedStart: cliNumber('seed-start', DEFAULT_DEATH_STRESS_SEED_START),
  seedCount: cliNumber('seed-count', DEFAULT_DEATH_STRESS_SEED_COUNT),
})

console.log(JSON.stringify(report, null, 2))
if (!report.allChecksPass) process.exitCode = 1
