// 码位规划配置（本项目唯一数据源；内容即 JSON 格式）
// 开发版 / 构建版 / 绿色免安装版统一读取本文件：运行时动态加载并带时间戳，编辑保存后刷新页面即生效。
// 若删除本文件，应用会回退到构建时内联的快照（仍可正常使用，只是不能再编辑该配置）。
window.__SNFONT_CODEPOINT_PLAN__ = {
  "version": 1,
  "generatedAt": "2026-09-08T07:06:17.408Z",
  "description": "码位规划：三段 Unicode 私人使用区(PUA)分布、参考映射占用动态统计、本项目（以当前项目名为准）图标码位分配规则。占用数字为运行时按最新 unicode-map.data.js 动态计算，刷新页面后自动更新（见 codepointStats.js）",
  "pua_ranges": {
    "pua_bmp": {
      "label": "私有使用区 (PUA, BMP)",
      "start": "U+E000",
      "end": "U+F8FF",
      "codepoints": 6400,
      "note": "Font 图标参考集与常规符号常用段"
    },
    "pua_a": {
      "label": "补充私有使用区-A (PUA-A, SMP)",
      "start": "U+F0000",
      "end": "U+FFFFD",
      "codepoints": 65534,
      "note": "大容量补充区，可容纳数十万图标"
    },
    "pua_b": {
      "label": "补充私有使用区-B (PUA-B, SSP)",
      "start": "U+100000",
      "end": "U+10FFFD",
      "codepoints": 65534,
      "note": "与 PUA-A 容量相同"
    }
  },
  "reference_occupancy": {
    "source": "unicode-map.data.js（参考图标集 v7.3.1 映射，4331 项）",
    "total_entries": 4331,
    "total_occupied_codepoints": 4293,
    "bmp_span": {
      "start": "U+E000",
      "end": "U+F8FF",
      "size": 6400,
      "occupied": 4283,
      "free": 2117
    },
    "sections": [
      {
        "range": "E000–E8CC",
        "start": "U+E000",
        "end": "U+E8CC",
        "size": 2253,
        "occupied": 2153,
        "free": 100
      },
      {
        "range": "E8CD–EFFF",
        "start": "U+E8CD",
        "end": "U+EFFF",
        "size": 1843,
        "occupied": 0,
        "free": 1843
      },
      {
        "range": "F000–F0FF",
        "start": "U+F000",
        "end": "U+F0FF",
        "size": 256,
        "occupied": 202,
        "free": 54
      },
      {
        "range": "F100–F8FF",
        "start": "U+F100",
        "end": "U+F8FF",
        "size": 2048,
        "occupied": 1928,
        "free": 120
      }
    ],
    "dynamic": true,
    "note": "下列数字为一次性快照（生成时的参考值）；页面刷新或点击「刷新统计」会按最新 unicode-map.data.js 重新分析（codepoint-stats）"
  },
  "project_alloc": {
    "range": "EE00–EFFF",
    "start": "U+EE00",
    "end": "U+EFFF",
    "codepoints": 512,
    "halves": [
      {
        "range": "EE00–EEFF",
        "start": "U+EE00",
        "end": "U+EEFF",
        "size": 256,
        "note": "本项目默认图标区（前 256 个）"
      },
      {
        "range": "EF00–EFFF",
        "start": "U+EF00",
        "end": "U+EFFF",
        "size": 256,
        "note": "本项目默认图标区（后 256 个）"
      }
    ],
    "occupied_by_reference": 0,
    "rule": [
      "新增图标从 U+EE00 起按顺序取用（nextCode 游标初始值 = 0xee00）",
      "游标只增不减：已删除图标的码位不再复用（#15，保证长期稳定）",
      "若 EE00–EFFF 用尽，自然顺延到 U+F000 之后；导入时保存原码位若落在保留区会提醒",
      "导入参考图标时保留其原码位（keepUnicode），与 EE00+ 新增图标天然不冲突；落在保留区则提醒确认",
      "改名、替换 SVG 不影响已分配码位"
    ]
  }
}
