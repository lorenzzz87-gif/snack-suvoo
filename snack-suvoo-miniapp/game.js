const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const SW = canvas.width
const SH = canvas.height

const COLS = 30, ROWS = 30
const CELL = Math.floor(Math.min(SW, SH * 0.82) / COLS)
const BOARD_W = CELL * COLS
const BOARD_H = CELL * ROWS
const BOARD_X = Math.floor((SW - BOARD_W) / 2)
const BOARD_Y = Math.floor(SH * 0.12)

const GREEN = '#00ff88'
const DARK = '#0a0a0f'
const BOARD_BG = '#0d0d15'

let snake, dir, nextDir, food, score, highscore, level, gameLoop, state
// state: 'start' | 'playing' | 'over'

highscore = wx.getStorageSync('snackHighscore') || 0

const logoImg = wx.createImage()
let logoLoaded = false
logoImg.onload = () => { logoLoaded = true }
logoImg.src = 'logo.jpg'

const SPEEDS = [200, 170, 140, 110, 90, 70, 55]
function getSpeed() { return SPEEDS[Math.min(level - 1, SPEEDS.length - 1)] }
function getLevel(s) { return Math.floor(s / 5) + 1 }

function randomFood() {
  let pos
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === pos.x && s.y === pos.y))
  return pos
}

function initGame() {
  snake = [{ x: 15, y: 15 }, { x: 14, y: 15 }, { x: 13, y: 15 }]
  dir = { x: 1, y: 0 }
  nextDir = { x: 1, y: 0 }
  score = 0
  level = 1
  food = randomFood()
  state = 'playing'
  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(tick, getSpeed())
}

function tick() {
  if (state !== 'playing') return
  dir = nextDir
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
      snake.some(s => s.x === head.x && s.y === head.y)) {
    endGame(); return
  }
  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) {
    score++
    if (score > highscore) {
      highscore = score
      wx.setStorageSync('snackHighscore', highscore)
    }
    const newLevel = getLevel(score)
    if (newLevel !== level) {
      level = newLevel
      clearInterval(gameLoop)
      gameLoop = setInterval(tick, getSpeed())
    }
    food = randomFood()
  } else {
    snake.pop()
  }
}

function endGame() {
  state = 'over'
  clearInterval(gameLoop)
}

function drawText(text, x, y, size, color, align) {
  ctx.fillStyle = color
  ctx.font = `bold ${size}px "Courier New", monospace`
  ctx.textAlign = align || 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function drawRoundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke() }
}

function draw() {
  ctx.clearRect(0, 0, SW, SH)
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, SW, SH)

  // header
  drawText('Snack Game', SW / 2, BOARD_Y * 0.35, Math.floor(CELL * 0.85), GREEN)

  // scoreboard
  const labelSize = Math.floor(CELL * 0.55)
  drawText(`分 ${score}`, SW * 0.2, BOARD_Y * 0.72, labelSize, '#aaa')
  drawText(`最高 ${highscore}`, SW * 0.5, BOARD_Y * 0.72, labelSize, '#aaa')
  drawText(`LV ${level}`, SW * 0.8, BOARD_Y * 0.72, labelSize, '#aaa')

  // board background
  ctx.fillStyle = BOARD_BG
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H)
  ctx.strokeStyle = '#00ff8844'
  ctx.lineWidth = 1.5
  ctx.strokeRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H)

  // grid
  ctx.strokeStyle = '#ffffff06'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(BOARD_X + x * CELL, BOARD_Y)
    ctx.lineTo(BOARD_X + x * CELL, BOARD_Y + BOARD_H)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(BOARD_X, BOARD_Y + y * CELL)
    ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + y * CELL)
    ctx.stroke()
  }

  if (state === 'playing' || state === 'over') {
    // snake
    snake.forEach((seg, i) => {
      const alpha = i === 0 ? 1 : Math.max(0.3, 1 - i * 0.02)
      ctx.fillStyle = i === 0 ? GREEN : `rgba(0,220,100,${alpha})`
      const pad = i === 0 ? 1 : 2
      ctx.fillRect(BOARD_X + seg.x * CELL + pad, BOARD_Y + seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2)
      if (i === 0) {
        ctx.fillStyle = DARK
        const ew = Math.max(2, CELL * 0.15), eh = ew
        const eo = Math.floor(CELL * 0.22)
        if (dir.x === 1) {
          ctx.fillRect(BOARD_X + seg.x * CELL + CELL - eo - ew, BOARD_Y + seg.y * CELL + eo, ew, eh)
          ctx.fillRect(BOARD_X + seg.x * CELL + CELL - eo - ew, BOARD_Y + seg.y * CELL + CELL - eo - eh, ew, eh)
        } else if (dir.x === -1) {
          ctx.fillRect(BOARD_X + seg.x * CELL + eo, BOARD_Y + seg.y * CELL + eo, ew, eh)
          ctx.fillRect(BOARD_X + seg.x * CELL + eo, BOARD_Y + seg.y * CELL + CELL - eo - eh, ew, eh)
        } else if (dir.y === -1) {
          ctx.fillRect(BOARD_X + seg.x * CELL + eo, BOARD_Y + seg.y * CELL + eo, ew, eh)
          ctx.fillRect(BOARD_X + seg.x * CELL + CELL - eo - ew, BOARD_Y + seg.y * CELL + eo, ew, eh)
        } else {
          ctx.fillRect(BOARD_X + seg.x * CELL + eo, BOARD_Y + seg.y * CELL + CELL - eo - eh, ew, eh)
          ctx.fillRect(BOARD_X + seg.x * CELL + CELL - eo - ew, BOARD_Y + seg.y * CELL + CELL - eo - eh, ew, eh)
        }
      }
    })

    // food (logo)
    const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 250)
    const logoSize = CELL * 1.8
    const fx = BOARD_X + food.x * CELL + CELL / 2
    const fy = BOARD_Y + food.y * CELL + CELL / 2
    if (logoLoaded) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(fx, fy, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logoImg, fx - logoSize / 2, fy - logoSize / 2, logoSize, logoSize)
      ctx.restore()
      ctx.strokeStyle = `rgba(220,50,50,${pulse * 0.9})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(fx, fy, logoSize / 2, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = `rgba(255,60,60,${pulse})`
      ctx.fillRect(BOARD_X + food.x * CELL + 2, BOARD_Y + food.y * CELL + 2, CELL - 4, CELL - 4)
    }
  }

  // overlays
  if (state === 'start') {
    ctx.fillStyle = 'rgba(13,13,21,0.92)'
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H)
    if (logoLoaded) {
      const ls = Math.floor(BOARD_W * 0.25)
      ctx.save()
      ctx.beginPath()
      ctx.arc(SW / 2, BOARD_Y + BOARD_H * 0.32, ls / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logoImg, SW / 2 - ls / 2, BOARD_Y + BOARD_H * 0.32 - ls / 2, ls, ls)
      ctx.restore()
    }
    drawText('Snack Game', SW / 2, BOARD_Y + BOARD_H * 0.52, Math.floor(CELL * 0.9), GREEN)
    drawText('滑动屏幕控制方向', SW / 2, BOARD_Y + BOARD_H * 0.62, Math.floor(CELL * 0.55), '#aaa')
    const bw = BOARD_W * 0.55, bh = CELL * 1.6
    const bx = SW / 2 - bw / 2, by = BOARD_Y + BOARD_H * 0.72
    drawRoundRect(bx, by, bw, bh, 8, null, GREEN)
    drawText('▶  开始游戏', SW / 2, by + bh / 2, Math.floor(CELL * 0.65), GREEN)
  }

  if (state === 'over') {
    ctx.fillStyle = 'rgba(13,13,21,0.88)'
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H)
    drawText('GAME OVER', SW / 2, BOARD_Y + BOARD_H * 0.35, Math.floor(CELL * 1.1), GREEN)
    drawText(`得分  ${score}`, SW / 2, BOARD_Y + BOARD_H * 0.48, Math.floor(CELL * 0.75), '#fff')
    drawText(`最高  ${highscore}`, SW / 2, BOARD_Y + BOARD_H * 0.57, Math.floor(CELL * 0.6), '#aaa')
    const bw = BOARD_W * 0.55, bh = CELL * 1.6
    const bx = SW / 2 - bw / 2, by = BOARD_Y + BOARD_H * 0.68
    drawRoundRect(bx, by, bw, bh, 8, null, GREEN)
    drawText('↺  再来一局', SW / 2, by + bh / 2, Math.floor(CELL * 0.65), GREEN)
  }
}

// touch swipe control
let touchStartX = 0, touchStartY = 0
wx.onTouchStart(e => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
})
wx.onTouchEnd(e => {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const adx = Math.abs(dx), ady = Math.abs(dy)

  if (state === 'start' || state === 'over') {
    if (adx < 20 && ady < 20) { initGame(); return }
  }

  if (adx < 10 && ady < 10) {
    if (state === 'start' || state === 'over') initGame()
    return
  }

  if (state !== 'playing') return
  if (adx > ady) {
    if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 }
    else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 }
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 }
    else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 }
  }
})

// game loop
state = 'start'
function loop() {
  draw()
  requestAnimationFrame(loop)
}
loop()
