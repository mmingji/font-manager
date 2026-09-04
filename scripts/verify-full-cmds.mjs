// 验证：完整命令支持（S/H/V/T/A 等）不再丢命令导致变形
import { parsePathCommands, pathBBox, commandsToPathData } from '../src/lib/svgNormalize.js'
import { svgPathToOpentypePath } from '../src/lib/buildFont.js'

// 构造一个含 S/H/V/A 命令的典型 Illustrator SVG path
// 这是 FontAwesome 类图标常见的 path 结构
const d = 'M512 128c-70.7 0-128 57.3-128 128h64c0-35.3 28.7-64 64-64v-64zM384 384h64v-64h-64v64zM512 0C229.2 0 0 229.2 0 512v256h128V512c0-212.1 171.9-384 384-384s384 171.9 384 384v256h128V512C1024 229.2 794.8 0 512 0z'

const cmds = parsePathCommands(d)
console.log('命令数:', cmds.length)
console.log('命令类型:', cmds.map((c) => c.type + (c.raw !== c.type ? 'r' : '')).join(' '))

const bb = pathBBox(cmds)
console.log('bbox:', { minX: bb.minX, minY: bb.minY, maxX: bb.maxX, maxY: bb.maxY })

// 归一化
const w = bb.maxX - bb.minX
const h = bb.maxY - bb.minY
const scale = 1000 / Math.max(w, h)
const offsetX = (1000 - w * scale) / 2 - bb.minX * scale
const offsetY = (1000 - h * scale) / 2 - bb.minY * scale
const newD = commandsToPathData(cmds, scale, offsetX, offsetY)
console.log('归一化后 path 前 120:', newD.slice(0, 120))

// 用 opentype 解析验证
const path = svgPathToOpentypePath(newD)
console.log('opentype path commands:', path.commands.length)

// 检查归一化后坐标范围
const cmds2 = parsePathCommands(newD)
const bb2 = pathBBox(cmds2)
console.log('归一化后 bbox:', { minX: +bb2.minX.toFixed(1), minY: +bb2.minY.toFixed(1), maxX: +bb2.maxX.toFixed(1), maxY: +bb2.maxY.toFixed(1) })
console.log('全部在 0~1000:', bb2.minX >= 0 && bb2.maxX <= 1000 && bb2.minY >= 0 && bb2.maxY <= 1000)
