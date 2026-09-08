import { defineStore } from 'pinia'
import { loadProject, saveProject } from '../lib/persist.js'
import { normalizeSvg } from '../lib/buildFont.js'
import { groupKeyOf, pinyinFullKey } from '../lib/pinyin.js'
import { isInReserved, reservedUsage, RESERVED_END } from '../lib/codepointPlan.js'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 生成分组：英文按名称首字母（A-Z），数字归 '0-9'，符号归 '#'；
// 中文图标名按拼音首字母分组（如 爱心→A、长城→C），组内按拼音排序。
// 分组 key 固定按 A-Z → 0-9 → # 规范顺序输出（不随图标数据乱序，保证侧边导航栏稳定）
// 注：图标名实际用于 CSS 类名/GSUB 连字仍限 ASCII；中文名仅作展示分组。
const GROUP_KEY_ORDER = []
for (let c = 65; c <= 90; c++) GROUP_KEY_ORDER.push(String.fromCharCode(c)) // A-Z
GROUP_KEY_ORDER.push('0-9', '#')
const KEY_RANK = new Map(GROUP_KEY_ORDER.map((k, i) => [k, i]))

export function groupIcons(icons) {
  // 先按"分组 key 优先级 + 组内拼音键"双重排序，保证分组固定 A-Z 序、组内拼音序
  const annotated = icons.map((icon) => {
    const key = groupKeyOf(icon.name)
    const rank = KEY_RANK.has(key) ? KEY_RANK.get(key) : KEY_RANK.get('#')
    return { icon, key, rank, sortKey: pinyinFullKey(icon.name) }
  })
  const sorted = annotated.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    if (a.sortKey < b.sortKey) return -1
    if (a.sortKey > b.sortKey) return 1
    return a.icon.name < b.icon.name ? -1 : a.icon.name > b.icon.name ? 1 : 0
  })

  const groups = []
  const map = new Map()
  for (const { icon, key } of sorted) {
    if (!map.has(key)) {
      map.set(key, [])
      groups.push({ key, icons: map.get(key) })
    }
    map.get(key).push(icon)
  }
  return groups
}


export const useProjectStore = defineStore('project', {
  state: () => {
    const saved = loadProject()
    return {
      name: saved?.name || 'snfont',
      icons: saved?.icons || [],
      svgSize: saved?.svgSize || 512,
      // 项目配置
      classPrefix: saved?.classPrefix || 'sn-',  // CSS 类前缀
      fontName: saved?.fontName || 'snfont',      // 字体名称
      weight: saved?.weight || 'regular',         // 基础字符字重：regular | bold（决定生成字体里的字母/符号取哪套）
      // 稳定码位游标：只增不减，删除图标不释放码位（#15）
      // 分配区间：U+EE00–U+EFFF（512 个），避开参考字体已占用的 E000–E8CC / F000+ 码位
      // 旧项目 nextCode 已推进过也保留（不回退），新图标统一从 EE00 起按序取用；
      // 若 EE00–EFFF 用尽则自然顺延（512 个通常足够一个图标项目）
      nextCode: saved?.nextCode || 0xee00
    }
  },

  getters: {
    groups(state) {
      return groupIcons(state.icons)
    },
    count(state) {
      return state.icons.length
    }
  },

  actions: {
    persist() {
      const ok = saveProject({
        name: this.name,
        icons: this.icons,
        svgSize: this.svgSize,
        classPrefix: this.classPrefix,
        fontName: this.fontName,
        weight: this.weight,
        nextCode: this.nextCode
      })
      // 保存失败（多为图标过多超出 localStorage 约 5MB 上限）时给一次可见提示；
      // 只提示一次，避免每次操作都弹窗。图标仍在当前页面可用，但刷新会丢失
      if (!ok && !this._saveWarned) {
        this._saveWarned = true
        alert('⚠️ 图标数据较多，超出浏览器本地存储上限，刷新后可能丢失。\n建议：及时「下载项目」保存备份，或删除部分图标。')
      }
    },

    renameProject(name) {
      this.name = name || 'snfont'
      this.persist()
    },

    setSvgSize(size) {
      this.svgSize = size
      this.persist()
    },

    setClassPrefix(prefix) {
      this.classPrefix = prefix || 'sn-'
      this.persist()
    },

    setFontName(name) {
      this.fontName = name || 'snfont'
      this.persist()
    },

    setWeight(weight) {
      this.weight = weight === 'bold' ? 'bold' : 'regular'
      this.persist()
    },


    // 检查「保持原 unicode」的码位是否落在保留区（会与自动分配图标争抢该区，提示用户权衡）
    // 返回值非空字符串即需提醒；空字符串表示码位不在保留区
    reservedAlertForCode(code) {
      if (isInReserved(code)) {
        return '⚠️ ' + code.toString(16).toUpperCase().padStart(4, '0') + ' 落在本项目保留区（U+EE00–U+EFFF），与自动分配的新图标区域重叠，建议取消「保持原字体 unicode」或改用其他码位'
      }
      return ''
    },

    // 分配一个稳定码位（#15：只增不减，绝不复用已释放的码位）
    allocateCode(keepUnicode = null) {
      if (keepUnicode != null) {
        // #7：保持原字体 unicode 码（传入的是十六进制或数字）
        const c = typeof keepUnicode === 'number' ? keepUnicode : parseInt(String(keepUnicode), 16)
        if (!isNaN(c) && c > 0 && c < 0x10ffff) {
          // 检查是否已被占用，占用则顺延
          const used = new Set(this.icons.map((i) => i.code))
          if (!used.has(c)) return c
          // 冲突：顺延到 nextCode 之后
        }
      }
      // 从游标开始找下一个未被占用的码位
      const used = new Set(this.icons.map((i) => i.code))
      let c = this.nextCode
      while (used.has(c)) c++
      this.nextCode = c + 1
      return c
    },

    addIcon(name, svg, keepUnicode = null) {
      return this.addIcons([{ name, svg, code: keepUnicode }]).added[0] || null
    },

    addIcons(items) {
      // items: [{ name, svg, code? }]
      // 返回 { added, codeAlerts, overflow }：
      //   added      新增图标数组
      //   codeAlerts 「保持原 unicode」的码位落在保留区时的逐条提示
      //   overflow   保留区已满提示（新图标顺延到保留区后）
      const added = []
      const codeAlerts = []
      const before = reservedUsage(this.icons)
      for (const item of items) {
        const keep = item.code
        const code = keep != null
          ? (() => {
              const num = typeof keep === 'number' ? keep : parseInt(String(keep), 16)
              const alert = this.reservedAlertForCode(num)
              if (alert) codeAlerts.push(alert)
              return this.allocateCode(keep)
            })()
          : this.allocateCode()
        added.push({ id: uid(), name: this.uniqueName(item.name), svg: item.svg, code })
      }
      this.icons.push(...added)
      this.persist()
      const after = reservedUsage(this.icons)
      let overflow = ''
      if (before.free > 0 && after.free === 0) {
        overflow = '⚠️ 本项目保留区（U+EE00–U+EFFF，512 个）已用满，新增图标将顺延到 U+F000 之后'
      } else if (before.free === 0) {
        // 导入前就已满：若本次新增了自动分配图标且其码位越过保留区
        const beyond = added.some((i) => i.code > RESERVED_END && !items.some((it) => it.code != null))
        if (beyond) overflow = '⚠️ 本项目保留区（U+EE00–U+EFFF）此前已满，本次新增图标已顺延到 U+F000 之后'
      }
      return { added, codeAlerts, overflow }
    },

    // 保证图标名唯一（重名加 _2、_3 后缀）
    uniqueName(name) {
      let base = String(name || '').trim() || 'icon'
      const names = new Set(this.icons.map((i) => i.name))
      if (!names.has(base)) return base
      let n = 2
      while (names.has(base + '_' + n)) n++
      return base + '_' + n
    },

    renameIcon(id, name) {
      const icon = this.icons.find((i) => i.id === id)
      if (icon) {
        const target = String(name || '').trim()
        if (!target) return
        const dup = this.icons.find((i) => i.id !== id && i.name === target)
        icon.name = dup ? this.uniqueName(target) : target
        // code 不变（#15：改名不影响码位）
        this.persist()
      }
    },

    // #2：替换单个图标的 svg（保留 name 和 code）
    replaceSvg(id, svg) {
      const icon = this.icons.find((i) => i.id === id)
      if (icon && svg) {
        icon.svg = svg
        this.persist()
      }
    },

    removeIcons(ids) {
      const set = new Set(ids)
      this.icons = this.icons.filter((i) => !set.has(i.id))
      // nextCode 不回退（#15：释放的码位不再复用）
      this.persist()
    },

    // 修复异常 SVG（旧版本解析出的负坐标/越界数据）
    repairSvg(icon) {
      const fixed = normalizeSvg(icon.svg, this.svgSize)
      if (fixed !== icon.svg) {
        icon.svg = fixed
        return true
      }
      return false
    },

    // 扫描并修复所有异常图标，返回修复数量
    repairAll() {
      let n = 0
      for (const icon of this.icons) {
        if (this.repairSvg(icon)) n++
      }
      if (n) this.persist()
      return n
    },

    // 导入项目备份：只追加图标，不覆盖当前项目名/字体名/前缀/字重/尺寸等配置，
    // 避免导入一个旧备份把当前项目设置意外改掉（"为什么带上了项目名称"问题）
    importProject(project) {
      // 返回 { count, codeAlerts, overflow }（count 兼容旧用法=新增数量）
      const codeAlerts = []
      const before = reservedUsage(this.icons)
      let count = 0
      if (project && Array.isArray(project.icons)) {
        const existed = new Set(this.icons.map((i) => i.name))
        const toAdd = []
        for (const i of project.icons) {
          const name = String(i.name || '').trim()
          if (!name) continue
          if (existed.has(name)) continue // 重名跳过
          existed.add(name)
          let code
          if (i.code != null) {
            const num = typeof i.code === 'number' ? i.code : parseInt(String(i.code), 16)
            const alert = this.reservedAlertForCode(num)
            if (alert) codeAlerts.push(alert)
            code = this.allocateCode(i.code)
          } else {
            code = this.allocateCode()
          }
          toAdd.push({ id: uid(), name, svg: i.svg || '', code })
        }
        this.icons.push(...toAdd)
        this.persist()
        count = toAdd.length
      }
      const after = reservedUsage(this.icons)
      let overflow = ''
      if (before.free > 0 && after.free === 0) {
        overflow = '⚠️ 本项目保留区（U+EE00–U+EFFF，512 个）已用满，新增图标将顺延到 U+F000 之后'
      }
      return { count, codeAlerts, overflow }
    },

  }
})
