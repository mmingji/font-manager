// SVG 规范化：将任意导入的 SVG 转为标准格式
// - 支持完整 SVG path 命令：M/m L/l H/h V/v C/c S/s Q/q T/t A/a Z/z（含隐式重复命令）
// - 输出统一为：大写绝对命令 + 坐标归一化到 viewBox 0 0 1000 1000
// 供导入、字体构建使用，保证 ttf 生成不因复杂 SVG 出错

// 解析 path d 字符串为命令数组 [{ type: 大写, raw: 原始字符, args: [...] }]
// 支持相对/绝对、紧凑格式、隐式重复命令（M 后多点 = L；C 后 12 数 = 两个 C）
export function parsePathCommands(d) {
  const re = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi
  const cmds = []
  let m, current = null
  while ((m = re.exec(d)) !== null) {
    if (m[1]) {
      current = { type: m[1].toUpperCase(), raw: m[1], args: [] }
      cmds.push(current)
    } else if (current) {
      current.args.push(parseFloat(m[2]))
    }
  }

  // 拆分隐式重复命令：把过长的 args 按各命令所需参数个数拆成多条
  // 注意：保留原始大小写（raw），相对命令信息不能丢
  const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
  const out = []
  for (const c of cmds) {
    const n = ARGS[c.type]
    if (n === 0) { out.push(c); continue }
    const count = Math.floor(c.args.length / n)
    if (count === 0) continue
    for (let i = 0; i < count; i++) {
      // 保留原始 raw（大小写），M 后的隐式点是相对/绝对 L（沿用 M 的大小写性质）
      const isM = c.type === 'M'
      const rawChar = i === 0 ? c.raw : (isM ? (c.raw === 'M' ? 'L' : 'l') : c.raw)
      const typeChar = i === 0 ? c.type : (isM ? 'L' : c.type)
      out.push({ type: typeChar, raw: rawChar, args: c.args.slice(i * n, i * n + n) })
    }
  }
  return out
}

// 将 A/a 椭圆弧转为若干 C 三次贝塞尔曲线，返回标准弧转贝塞尔的结果
// 输入为弧在当前坐标系的绝对坐标
export function arcToCubic(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  const result = []
  if (rx === 0 || ry === 0) {
    result.push([x1, y1, x2, y2, x2, y2])
    return result
  }
  rx = Math.abs(rx); ry = Math.abs(ry)
  const phiRad = (phi * Math.PI) / 180
  const cosphi = Math.cos(phiRad)
  const sinphi = Math.sin(phiRad)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  let x1p = cosphi * dx + sinphi * dy
  let y1p = -sinphi * dx + cosphi * dy
  let rx2 = rx * rx, ry2 = ry * ry
  let x1p2 = x1p * x1p, y1p2 = y1p * y1p
  let lambda = x1p2 / rx2 + y1p2 / ry2
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s; ry *= s; rx2 = rx * rx; ry2 = ry * ry
  }
  let sign = largeArc === sweep ? -1 : 1
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2)
  const den = rx2 * y1p2 + ry2 * x1p2
  let coef = sign * Math.sqrt(num / den)
  const cxp = coef * (rx * y1p) / ry
  const cyp = coef * -(ry * x1p) / rx
  let cx = cosphi * cxp - sinphi * cyp + (x1 + x2) / 2
  let cy = sinphi * cxp + cosphi * cyp + (y1 + y2) / 2
  let theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx)
  let dtheta = Math.atan2((-(y1p + cyp)) / ry, (-(x1p + cxp)) / rx) - theta1
  if (sweep === 0 && dtheta > 0) dtheta -= 2 * Math.PI
  if (sweep === 1 && dtheta < 0) dtheta += 2 * Math.PI
  const segments = Math.max(1, Math.ceil(Math.abs(dtheta / (Math.PI / 2))))
  const delta = dtheta / segments
  const t = (8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4) / Math.sin(delta / 2)
  let px = x1, py = y1
  for (let i = 0; i < segments; i++) {
    const theta = theta1 + delta * (i + 1)
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    const x3 = cosphi * (rx * cosT) - sinphi * (ry * sinT) + cx
    const y3 = sinphi * (rx * cosT) + cosphi * (ry * sinT) + cy
    const thetaPrev = theta1 + delta * i
    const cosTp = Math.cos(thetaPrev), sinTp = Math.sin(thetaPrev)
    const x1c = cosphi * (rx * cosTp) - sinphi * (ry * sinTp) + cx
    const y1c = sinphi * (rx * cosTp) + cosphi * (ry * sinTp) + cy
    const dx1 = (px - x1c) * t
    const dy1 = (py - y1c) * t
    const dx2 = (x3 - x1c) * t
    const dy2 = (y3 - y1c) * t
    result.push([px + dx1, py + dy1, x3 - dx2, y3 - dy2, x3, y3])
    px = x3; py = y3
  }
  return result
}

// 计算 path 命令的 bbox（支持全部命令，处理相对坐标）
export function pathBBox(cmds) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let cx = 0, cy = 0, sx = 0, sy = 0
  let prevC1x = 0, prevC1y = 0 // 上一段 C/S 的第二个控制点（用于 S 镜像）
  let prevQx = 0, prevQy = 0    // 上一段 Q/T 的控制点（用于 T 镜像）
  let prevIsC = false, prevIsQ = false

  const collect = (x, y) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const walk = (cmds) => {
    for (const { type, raw, args } of cmds) {
      const rel = raw !== type
      const A = (i) => (rel ? cx + args[i] : args[i])
      const B = (i) => (rel ? cy + args[i] : args[i])
      switch (type) {
        case 'M':
          cx = A(0); cy = B(1); sx = cx; sy = cy; collect(cx, cy)
          prevIsC = prevIsQ = false
          break
        case 'L':
          cx = A(0); cy = B(1); collect(cx, cy)
          prevIsC = prevIsQ = false
          break
        case 'H':
          cx = rel ? cx + args[0] : args[0]; collect(cx, cy)
          prevIsC = prevIsQ = false
          break
        case 'V':
          cy = rel ? cy + args[0] : args[0]; collect(cx, cy)
          prevIsC = prevIsQ = false
          break
        case 'C':
          collect(A(0), B(1)); collect(A(2), B(3));
          // 先记录本段控制2(供 S 镜像)，再更新当前点，避免用终点坐标算镜像
          prevC1x = A(2); prevC1y = B(3); prevIsC = true; prevIsQ = false
          cx = A(4); cy = B(5); collect(cx, cy)
          break
        case 'S':
          {
            let c1x, c1y
            if (prevIsC) { c1x = 2 * cx - prevC1x; c1y = 2 * cy - prevC1y }
            else { c1x = cx; c1y = cy }
            collect(c1x, c1y); collect(A(0), B(1));
            // 先记录本段控制2(供下一个 S 镜像)，再更新当前点——顺序颠倒会让镜像用终点坐标
            prevC1x = A(0); prevC1y = B(1); prevIsC = true; prevIsQ = false
            cx = A(2); cy = B(3); collect(cx, cy)
          }
          break
        case 'Q':
          collect(A(0), B(1)); cx = A(2); cy = B(3); collect(cx, cy)
          prevQx = A(0); prevQy = B(1); prevIsQ = true; prevIsC = false
          break
        case 'T':
          {
            let qx, qy
            if (prevIsQ) { qx = 2 * cx - prevQx; qy = 2 * cy - prevQy }
            else { qx = cx; qy = cy }
            collect(qx, qy); cx = A(0); cy = B(1); collect(cx, cy)
            prevQx = qx; prevQy = qy; prevIsQ = true; prevIsC = false
          }
          break
        case 'A':
          {
            const x1 = cx, y1 = cy
            const x2 = A(5), y2 = B(6)
            const rx = args[0], ry = args[1], phi = args[2]
            const largeArc = args[3], sweep = args[4]
            const curves = arcToCubic(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2)
            for (const c of curves) { collect(c[0], c[1]); collect(c[2], c[3]); collect(c[4], c[5]) }
            cx = x2; cy = y2
            prevIsC = prevIsQ = false
          }
          break
        case 'Z':
          cx = sx; cy = sy
          prevIsC = prevIsQ = false
          break
      }
    }
  }
  walk(cmds)
  return { minX, minY, maxX, maxY }
}

// 将命令序列转成规范 path 字符串（大写绝对命令），可选 scale 与平移
export function commandsToPathData(cmds, scale = 1, offsetX = 0, offsetY = 0) {
  let out = ''
  let cx = 0, cy = 0, sx = 0, sy = 0
  let prevC1x = 0, prevC1y = 0, prevIsC = false
  let prevQx = 0, prevQy = 0, prevIsQ = false
  const X = (v) => +((v * scale) + offsetX).toFixed(2)
  const Y = (v) => +((v * scale) + offsetY).toFixed(2)

  for (const { type, raw, args } of cmds) {
    const rel = raw !== type
    const A = (i) => (rel ? cx + args[i] : args[i])
    const B = (i) => (rel ? cy + args[i] : args[i])
    switch (type) {
      case 'M':
        cx = A(0); cy = B(1); sx = cx; sy = cy
        out += `M${X(cx)} ${Y(cy)}`
        prevIsC = prevIsQ = false
        break
      case 'L':
        cx = A(0); cy = B(1)
        out += `L${X(cx)} ${Y(cy)}`
        prevIsC = prevIsQ = false
        break
      case 'H':
        cx = rel ? cx + args[0] : args[0]
        out += `L${X(cx)} ${Y(cy)}`
        prevIsC = prevIsQ = false
        break
      case 'V':
        cy = rel ? cy + args[0] : args[0]
        out += `L${X(cx)} ${Y(cy)}`
        prevIsC = prevIsQ = false
        break
      case 'C':
        out += `C${X(A(0))} ${Y(B(1))} ${X(A(2))} ${Y(B(3))} ${X(A(4))} ${Y(B(5))}`
        // 先记录本段第二个控制点(供后续 S 镜像)，再更新当前点——顺序颠倒会用终点坐标算镜像导致 S 变形
        prevC1x = A(2); prevC1y = B(3); prevIsC = true; prevIsQ = false
        cx = A(4); cy = B(5)
        break
      case 'S':
        {
          let c1x, c1y
          if (prevIsC) { c1x = 2 * cx - prevC1x; c1y = 2 * cy - prevC1y }
          else { c1x = cx; c1y = cy }
          out += `C${X(c1x)} ${Y(c1y)} ${X(A(0))} ${Y(B(1))} ${X(A(2))} ${Y(B(3))}`
          // 先记录本段控制2(供下一个 S 镜像)，再更新当前点——顺序颠倒会让镜像用终点坐标
          prevC1x = A(0); prevC1y = B(1); prevIsC = true; prevIsQ = false
          cx = A(2); cy = B(3)
        }
        break
      case 'Q':
        out += `Q${X(A(0))} ${Y(B(1))} ${X(A(2))} ${Y(B(3))}`
        cx = A(2); cy = B(3)
        prevQx = A(0); prevQy = B(1); prevIsQ = true; prevIsC = false
        break
      case 'T':
        {
          let qx, qy
          if (prevIsQ) { qx = 2 * cx - prevQx; qy = 2 * cy - prevQy }
          else { qx = cx; qy = cy }
          out += `Q${X(qx)} ${Y(qy)} ${X(A(0))} ${Y(B(1))}`
          cx = A(0); cy = B(1)
          prevQx = qx; prevQy = qy; prevIsQ = true; prevIsC = false
        }
        break
      case 'A':
        {
          const x1 = cx, y1 = cy
          const x2 = A(5), y2 = B(6)
          const curves = arcToCubic(x1, y1, args[0], args[1], args[2], args[3], args[4], x2, y2)
          for (const c of curves) {
            out += `C${X(c[0])} ${Y(c[1])} ${X(c[2])} ${Y(c[3])} ${X(c[4])} ${Y(c[5])}`
          }
          cx = x2; cy = y2
          prevIsC = prevIsQ = false
        }
        break
      case 'Z':
        out += 'Z'
        cx = sx; cy = sy
        prevIsC = prevIsQ = false
        break
    }
  }
  return out
}

// 将任意 SVG 字符串规范化为标准 SVG（viewBox 0 0 1000 1000，大写绝对命令，坐标归一化）
// 返回 { svg, changed }，changed 表示是否发生了转换
// 用正则提取 path（不依赖 DOMParser，浏览器/Node 行为一致）
export function normalizeSvgImport(svg, size = 512) {
  try {
    const s = String(svg)
    // 提取所有 <path ... d="..."> 的 d 属性（精确匹配，避免 id= 干扰）
    const pathRe = /<path\b[^>]*?\bd\s*=\s*["']([^"']*)["'][^>]*>/gi
    const allCmds = []
    let pm
    while ((pm = pathRe.exec(s)) !== null) {
      const d = pm[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      if (!d.trim()) continue
      // 过滤孤立单点 path（如 Illustrator 导出的 M320,256 这类只有 moveTo、无轮廓的点），
      // 否则它们会被计入 bbox 拉大整体范围，导致真实图标被缩小/偏移
      if (!/[LCQASTZ]/i.test(d)) continue
      const cmds = parsePathCommands(d)
      if (cmds.length) allCmds.push(...cmds)
    }
    if (!allCmds.length) return { svg, changed: false }

    // 检查是否已有规范坐标（已在 0~1000 内且全大写且无复杂命令）
    const bb = pathBBox(allCmds)
    const allUpper = allCmds.every((c) => c.raw === c.type)
    const hasComplex = allCmds.some((c) => ['H', 'V', 'S', 'T', 'A'].includes(c.type))
    const alreadyNormal = bb.minX >= -1 && bb.minY >= -1 && bb.maxX <= 1001 && bb.maxY <= 1001 && !hasComplex

    if (alreadyNormal && allUpper) {
      // 已是标准格式，只统一尺寸
      const clean = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${size}" height="${size}"><path d="${commandsToPathData(allCmds)}" fill="currentColor"/></svg>`
      return { svg: clean, changed: clean !== svg }
    }

    // 需要归一化：缩放到 1000 内并居中
    const w = bb.maxX - bb.minX
    const h = bb.maxY - bb.minY
    if (!(w > 0) || !(h > 0)) return { svg, changed: false }

    const scale = 1000 / Math.max(w, h)
    const offsetX = (1000 - w * scale) / 2 - bb.minX * scale
    const offsetY = (1000 - h * scale) / 2 - bb.minY * scale
    const newD = commandsToPathData(allCmds, scale, offsetX, offsetY)

    const clean = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${size}" height="${size}"><path d="${newD}" fill="currentColor"/></svg>`
    return { svg: clean, changed: true }
  } catch {
    return { svg, changed: false }
  }
}
