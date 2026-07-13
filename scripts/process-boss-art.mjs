import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(projectRoot, 'public/assets/bosses')
const chromaKeyTool = resolve(process.env.CODEX_HOME || `${process.env.HOME}/.codex`, 'skills/.system/imagegen/scripts/remove_chroma_key.py')
const sources = Object.freeze({
  scissors: '/Users/austinbeatty/.codex/generated_images/019f592f-856b-7642-b3a0-8d57b0aa775d/exec-3961a817-8b7c-4b74-9e9d-289abbfedc5e.png',
  wind: '/Users/austinbeatty/.codex/generated_images/019f592f-856b-7642-b3a0-8d57b0aa775d/exec-aaad02b1-def1-4210-b419-eb648fad968a.png',
})

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function validateAlpha(file) {
  const code = `
from pathlib import Path
from PIL import Image
import sys

path = Path(sys.argv[1])
image = Image.open(path).convert('RGBA')
width, height = image.size
pixels = list(image.get_flattened_data())
alpha = [pixel[3] for pixel in pixels]
corners = [pixels[0][3], pixels[width - 1][3], pixels[(height - 1) * width][3], pixels[-1][3]]
visible = [pixel for pixel in pixels if pixel[3] > 16]
magenta = sum(1 for red, green, blue, _ in visible if red > 180 and green < 90 and blue > 150)
bounds = Image.frombytes('L', image.size, bytes(alpha)).getbbox()

if not bounds or any(corner != 0 for corner in corners):
    raise SystemExit(f'{path}: alpha corners are not fully transparent')
if not (bounds[0] > 0 and bounds[1] > 0 and bounds[2] < width and bounds[3] < height):
    raise SystemExit(f'{path}: subject bounds are clipped: {bounds}')
if sum(value == 0 for value in alpha) < (width * height) // 4:
    raise SystemExit(f'{path}: expected transparent matte and interior gaps')
if magenta:
    raise SystemExit(f'{path}: found {magenta} visible magenta-fringe pixels')

print(f'{path.name}: {width}x{height}, bounds={bounds}, transparent={sum(value == 0 for value in alpha)}, visible-magenta={magenta}')
`
  run('python3', ['-c', code, file])
}

mkdirSync(outputDirectory, { recursive: true })

for (const [id, source] of Object.entries(sources)) {
  const png = resolve(outputDirectory, `${id}.png`)
  const matteRemoved = resolve(outputDirectory, `${id}.matte-removed.png`)
  const webp = resolve(outputDirectory, `${id}.webp`)

  run('python3', [
    chromaKeyTool,
    '--input', source,
    '--out', matteRemoved,
    '--key-color', '#ff00ff',
    '--soft-matte',
    '--transparent-threshold', '12',
    '--opaque-threshold', '220',
    '--despill',
    '--force',
  ])
  run('sips', ['--resampleWidth', '1024', '-s', 'format', 'png', matteRemoved, '--out', png])
  rmSync(matteRemoved)
  validateAlpha(png)
  run('cwebp', ['-quiet', '-q', '92', '-alpha_q', '100', png, '-o', webp])
  console.log(`Wrote ${png} and ${webp}`)
}
