// fontkit 2.0.4 浏览器构建的打包快照（vendored 单一 ESM 文件，515KB）
// 生成命令（含 brotli 依赖替代；brotli 仅用于 fontkit 自带的 woff2 路径，本项目不走）：
//   npm i -D fontkit && npx esbuild node_modules/fontkit/dist/browser-module.mjs --bundle --format=esm \
//     --outfile=src/lib/fontkit-bundle.mjs --alias:brotli/decompress.js=./src/lib/brotli-stub.js && npm uninstall fontkit
// 为什么 vendored 而不是运行时依赖：见 lib/parseFont.js 头部注释（引擎选型与 opentype bug）
ck.shift();
                  y = c2y + stack.shift();
                  x = c2x + (stack.length === 1 ? stack.shift() : 0);
                } else {
                  c1x = x;
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y + (stack.length === 1 ? stack.shift() : 0);
                }
                path.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
                phase = !phase;
              }
              break;
            case 12:
              op = stream.readUInt8();
              switch (op) {
                case 3:
                  let a = stack.pop();
                  let b = stack.pop();
                  stack.push(a && b ? 1 : 0);
                  break;
                case 4:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a || b ? 1 : 0);
                  break;
                case 5:
                  a = stack.pop();
                  stack.push(a ? 0 : 1);
                  break;
                case 9:
                  a = stack.pop();
                  stack.push(Math.abs(a));
                  break;
                case 10:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a + b);
                  break;
                case 11:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a - b);
                  break;
                case 12:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a / b);
                  break;
                case 14:
                  a = stack.pop();
                  stack.push(-a);
                  break;
                case 15:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a === b ? 1 : 0);
                  break;
                case 18:
                  stack.pop();
                  break;
                case 20:
                  let val = stack.pop();
                  let idx = stack.pop();
                  trans[idx] = val;
                  break;
                case 21:
                  idx = stack.pop();
                  stack.push(trans[idx] || 0);
                  break;
                case 22:
                  let s1 = stack.pop();
                  let s2 = stack.pop();
                  let v1 = stack.pop();
                  let v2 = stack.pop();
                  stack.push(v1 <= v2 ? s1 : s2);
                  break;
                case 23:
                  stack.push(Math.random());
                  break;
                case 24:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(a * b);
                  break;
                case 26:
                  a = stack.pop();
                  stack.push(Math.sqrt(a));
                  break;
                case 27:
                  a = stack.pop();
                  stack.push(a, a);
                  break;
                case 28:
                  a = stack.pop();
                  b = stack.pop();
                  stack.push(b, a);
                  break;
                case 29:
                  idx = stack.pop();
                  if (idx < 0) idx = 0;
                  else if (idx > stack.length - 1) idx = stack.length - 1;
                  stack.push(stack[idx]);
                  break;
                case 30:
                  let n = stack.pop();
                  let j = stack.pop();
                  if (j >= 0) while (j > 0) {
                    var t = stack[n - 1];
                    for (let i = n - 2; i >= 0; i--) stack[i + 1] = stack[i];
                    stack[0] = t;
                    j--;
                  }
                  else while (j < 0) {
                    var t = stack[0];
                    for (let i = 0; i <= n; i++) stack[i] = stack[i + 1];
                    stack[n - 1] = t;
                    j++;
                  }
                  break;
                case 34:
                  c1x = x + stack.shift();
                  c1y = y;
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  c3x = c2x + stack.shift();
                  c3y = c2y;
                  c4x = c3x + stack.shift();
                  c4y = c3y;
                  c5x = c4x + stack.shift();
                  c5y = c4y;
                  c6x = c5x + stack.shift();
                  c6y = c5y;
                  x = c6x;
                  y = c6y;
                  path.bezierCurveTo(c1x, c1y, c2x, c2y, c3x, c3y);
                  path.bezierCurveTo(c4x, c4y, c5x, c5y, c6x, c6y);
                  break;
                case 35:
                  pts = [];
                  for (let i = 0; i <= 5; i++) {
                    x += stack.shift();
                    y += stack.shift();
                    pts.push(x, y);
                  }
                  path.bezierCurveTo(...pts.slice(0, 6));
                  path.bezierCurveTo(...pts.slice(6));
                  stack.shift();
                  break;
                case 36:
                  c1x = x + stack.shift();
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  c3x = c2x + stack.shift();
                  c3y = c2y;
                  c4x = c3x + stack.shift();
                  c4y = c3y;
                  c5x = c4x + stack.shift();
                  c5y = c4y + stack.shift();
                  c6x = c5x + stack.shift();
                  c6y = c5y;
                  x = c6x;
                  y = c6y;
                  path.bezierCurveTo(c1x, c1y, c2x, c2y, c3x, c3y);
                  path.bezierCurveTo(c4x, c4y, c5x, c5y, c6x, c6y);
                  break;
                case 37:
                  let startx = x;
                  let starty = y;
                  pts = [];
                  for (let i = 0; i <= 4; i++) {
                    x += stack.shift();
                    y += stack.shift();
                    pts.push(x, y);
                  }
                  if (Math.abs(x - startx) > Math.abs(y - starty)) {
                    x += stack.shift();
                    y = starty;
                  } else {
                    x = startx;
                    y += stack.shift();
                  }
                  pts.push(x, y);
                  path.bezierCurveTo(...pts.slice(0, 6));
                  path.bezierCurveTo(...pts.slice(6));
                  break;
                default:
                  throw new Error(`Unknown op: 12 ${op}`);
              }
              break;
            default:
              throw new Error(`Unknown op: ${op}`);
          }
        } else if (op < 247) stack.push(op - 139);
        else if (op < 251) {
          var b1 = stream.readUInt8();
          stack.push((op - 247) * 256 + b1 + 108);
        } else if (op < 255) {
          var b1 = stream.readUInt8();
          stack.push(-(op - 251) * 256 - b1 - 108);
        } else stack.push(stream.readInt32BE() / 65536);
      }
    };
    parse();
    if (open) path.closePath();
    return path;
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "CFF");
  }
};
var $25d8f049c222084c$var$SBIXImage = new Struct({
  originX: uint16,
  originY: uint16,
  type: new StringT(4),
  data: new BufferT((t) => t.parent.buflen - t._currentOffset)
});
var $25d8f049c222084c$export$2e2bcd8739ae039 = class extends (0, $69aac16029968692$export$2e2bcd8739ae039) {
  /**
  * Returns an object representing a glyph image at the given point size.
  * The object has a data property with a Buffer containing the actual image data,
  * along with the image type, and origin.
  *
  * @param {number} size
  * @return {object}
  */
  getImageForSize(size) {
    for (let i = 0; i < this._font.sbix.imageTables.length; i++) {
      var table = this._font.sbix.imageTables[i];
      if (table.ppem >= size) break;
    }
    let offsets = table.imageOffsets;
    let start = offsets[this.id];
    let end = offsets[this.id + 1];
    if (start === end) return null;
    this._font.stream.pos = start;
    return $25d8f049c222084c$var$SBIXImage.decode(this._font.stream, {
      buflen: end - start
    });
  }
  render(ctx, size) {
    let img = this.getImageForSize(size);
    if (img != null) {
      let scale = size / this._font.unitsPerEm;
      ctx.image(img.data, {
        height: size,
        x: img.originX,
        y: (this.bbox.minY - img.originY) * scale
      });
    }
    if (this._font.sbix.flags.renderOutlines) super.render(ctx, size);
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "SBIX");
  }
};
var $0d411f0165859681$var$COLRLayer = class {
  constructor(glyph, color) {
    this.glyph = glyph;
    this.color = color;
  }
};
var $0d411f0165859681$export$2e2bcd8739ae039 = class extends (0, $f92906be28e61769$export$2e2bcd8739ae039) {
  _getBBox() {
    let bbox = new (0, $f34600ab9d7f70d8$export$2e2bcd8739ae039)();
    for (let i = 0; i < this.layers.length; i++) {
      let layer = this.layers[i];
      let b = layer.glyph.bbox;
      bbox.addPoint(b.minX, b.minY);
      bbox.addPoint(b.maxX, b.maxY);
    }
    return bbox;
  }
  /**
  * Returns an array of objects containing the glyph and color for
  * each layer in the composite color glyph.
  * @type {object[]}
  */
  get layers() {
    let cpal = this._font.CPAL;
    let colr = this._font.COLR;
    let low = 0;
    let high = colr.baseGlyphRecord.length - 1;
    while (low <= high) {
      let mid = low + high >> 1;
      var rec = colr.baseGlyphRecord[mid];
      if (this.id < rec.gid) high = mid - 1;
      else if (this.id > rec.gid) low = mid + 1;
      else {
        var baseLayer = rec;
        break;
      }
    }
    if (baseLayer == null) {
      var g = this._font._getBaseGlyph(this.id);
      var color = {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 255
      };
      return [
        new $0d411f0165859681$var$COLRLayer(g, color)
      ];
    }
    let layers = [];
    for (let i = baseLayer.firstLayerIndex; i < baseLayer.firstLayerIndex + baseLayer.numLayers; i++) {
      var rec = colr.layerRecords[i];
      var color = cpal.colorRecords[rec.paletteIndex];
      var g = this._font._getBaseGlyph(rec.gid);
      layers.push(new $0d411f0165859681$var$COLRLayer(g, color));
    }
    return layers;
  }
  render(ctx, size) {
    for (let { glyph, color } of this.layers) {
      ctx.fillColor([
        color.red,
        color.green,
        color.blue
      ], color.alpha / 255 * 100);
      glyph.render(ctx, size);
    }
    return;
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "COLR");
  }
};
var $0bb840cac04e911b$var$TUPLES_SHARE_POINT_NUMBERS = 32768;
var $0bb840cac04e911b$var$TUPLE_COUNT_MASK = 4095;
var $0bb840cac04e911b$var$EMBEDDED_TUPLE_COORD = 32768;
var $0bb840cac04e911b$var$INTERMEDIATE_TUPLE = 16384;
var $0bb840cac04e911b$var$PRIVATE_POINT_NUMBERS = 8192;
var $0bb840cac04e911b$var$TUPLE_INDEX_MASK = 4095;
var $0bb840cac04e911b$var$POINTS_ARE_WORDS = 128;
var $0bb840cac04e911b$var$POINT_RUN_COUNT_MASK = 127;
var $0bb840cac04e911b$var$DELTAS_ARE_ZERO = 128;
var $0bb840cac04e911b$var$DELTAS_ARE_WORDS = 64;
var $0bb840cac04e911b$var$DELTA_RUN_COUNT_MASK = 63;
var $0bb840cac04e911b$export$2e2bcd8739ae039 = class {
  normalizeCoords(coords) {
    let normalized = [];
    for (var i = 0; i < this.font.fvar.axis.length; i++) {
      let axis = this.font.fvar.axis[i];
      if (coords[i] < axis.defaultValue) normalized.push((coords[i] - axis.defaultValue + Number.EPSILON) / (axis.defaultValue - axis.minValue + Number.EPSILON));
      else normalized.push((coords[i] - axis.defaultValue + Number.EPSILON) / (axis.maxValue - axis.defaultValue + Number.EPSILON));
    }
    if (this.font.avar) for (var i = 0; i < this.font.avar.segment.length; i++) {
      let segment = this.font.avar.segment[i];
      for (let j = 0; j < segment.correspondence.length; j++) {
        let pair = segment.correspondence[j];
        if (j >= 1 && normalized[i] < pair.fromCoord) {
          let prev = segment.correspondence[j - 1];
          normalized[i] = ((normalized[i] - prev.fromCoord) * (pair.toCoord - prev.toCoord) + Number.EPSILON) / (pair.fromCoord - prev.fromCoord + Number.EPSILON) + prev.toCoord;
          break;
        }
      }
    }
    return normalized;
  }
  transformPoints(gid, glyphPoints) {
    if (!this.font.fvar || !this.font.gvar) return;
    let { gvar } = this.font;
    if (gid >= gvar.glyphCount) return;
    let offset = gvar.offsets[gid];
    if (offset === gvar.offsets[gid + 1]) return;
    let { stream } = this.font;
    stream.pos = offset;
    if (stream.pos >= stream.length) return;
    let tupleCount = stream.readUInt16BE();
    let offsetToData = offset + stream.readUInt16BE();
    if (tupleCount & $0bb840cac04e911b$var$TUPLES_SHARE_POINT_NUMBERS) {
      var here = stream.pos;
      stream.pos = offsetToData;
      var sharedPoints = this.decodePoints();
      offsetToData = stream.pos;
      stream.pos = here;
    }
    let origPoints = glyphPoints.map((pt) => pt.copy());
    tupleCount &= $0bb840cac04e911b$var$TUPLE_COUNT_MASK;
    for (let i = 0; i < tupleCount; i++) {
      let tupleDataSize = stream.readUInt16BE();
      let tupleIndex = stream.readUInt16BE();
      if (tupleIndex & $0bb840cac04e911b$var$EMBEDDED_TUPLE_COORD) {
        var tupleCoords = [];
        for (let a = 0; a < gvar.axisCount; a++) tupleCoords.push(stream.readInt16BE() / 16384);
      } else {
        if ((tupleIndex & $0bb840cac04e911b$var$TUPLE_INDEX_MASK) >= gvar.globalCoordCount) throw new Error("Invalid gvar table");
        var tupleCoords = gvar.globalCoords[tupleIndex & $0bb840cac04e911b$var$TUPLE_INDEX_MASK];
      }
      if (tupleIndex & $0bb840cac04e911b$var$INTERMEDIATE_TUPLE) {
        var startCoords = [];
        for (let a = 0; a < gvar.axisCount; a++) startCoords.push(stream.readInt16BE() / 16384);
        var endCoords = [];
        for (let a = 0; a < gvar.axisCount; a++) endCoords.push(stream.readInt16BE() / 16384);
      }
      let factor = this.tupleFactor(tupleIndex, tupleCoords, startCoords, endCoords);
      if (factor === 0) {
        offsetToData += tupleDataSize;
        continue;
      }
      var here = stream.pos;
      stream.pos = offsetToData;
      if (tupleIndex & $0bb840cac04e911b$var$PRIVATE_POINT_NUMBERS) var points = this.decodePoints();
      else var points = sharedPoints;
      let nPoints = points.length === 0 ? glyphPoints.length : points.length;
      let xDeltas = this.decodeDeltas(nPoints);
      let yDeltas = this.decodeDeltas(nPoints);
      if (points.length === 0) for (let i2 = 0; i2 < glyphPoints.length; i2++) {
        var point = glyphPoints[i2];
        point.x += Math.round(xDeltas[i2] * factor);
        point.y += Math.round(yDeltas[i2] * factor);
      }
      else {
        let outPoints = origPoints.map((pt) => pt.copy());
        let hasDelta = glyphPoints.map(() => false);
        for (let i2 = 0; i2 < points.length; i2++) {
          let idx = points[i2];
          if (idx < glyphPoints.length) {
            let point2 = outPoints[idx];
            hasDelta[idx] = true;
            point2.x += xDeltas[i2] * factor;
            point2.y += yDeltas[i2] * factor;
          }
        }
        this.interpolateMissingDeltas(outPoints, origPoints, hasDelta);
        for (let i2 = 0; i2 < glyphPoints.length; i2++) {
          let deltaX = outPoints[i2].x - origPoints[i2].x;
          let deltaY = outPoints[i2].y - origPoints[i2].y;
          glyphPoints[i2].x = Math.round(glyphPoints[i2].x + deltaX);
          glyphPoints[i2].y = Math.round(glyphPoints[i2].y + deltaY);
        }
      }
      offsetToData += tupleDataSize;
      stream.pos = here;
    }
  }
  decodePoints() {
    let stream = this.font.stream;
    let count = stream.readUInt8();
    if (count & $0bb840cac04e911b$var$POINTS_ARE_WORDS) count = (count & $0bb840cac04e911b$var$POINT_RUN_COUNT_MASK) << 8 | stream.readUInt8();
    let points = new Uint16Array(count);
    let i = 0;
    let point = 0;
    while (i < count) {
      let run = stream.readUInt8();
      let runCount = (run & $0bb840cac04e911b$var$POINT_RUN_COUNT_MASK) + 1;
      let fn = run & $0bb840cac04e911b$var$POINTS_ARE_WORDS ? stream.readUInt16 : stream.readUInt8;
      for (let j = 0; j < runCount && i < count; j++) {
        point += fn.call(stream);
        points[i++] = point;
      }
    }
    return points;
  }
  decodeDeltas(count) {
    let stream = this.font.stream;
    let i = 0;
    let deltas = new Int16Array(count);
    while (i < count) {
      let run = stream.readUInt8();
      let runCount = (run & $0bb840cac04e911b$var$DELTA_RUN_COUNT_MASK) + 1;
      if (run & $0bb840cac04e911b$var$DELTAS_ARE_ZERO) i += runCount;
      else {
        let fn = run & $0bb840cac04e911b$var$DELTAS_ARE_WORDS ? stream.readInt16BE : stream.readInt8;
        for (let j = 0; j < runCount && i < count; j++) deltas[i++] = fn.call(stream);
      }
    }
    return deltas;
  }
  tupleFactor(tupleIndex, tupleCoords, startCoords, endCoords) {
    let normalized = this.normalizedCoords;
    let { gvar } = this.font;
    let factor = 1;
    for (let i = 0; i < gvar.axisCount; i++) {
      if (tupleCoords[i] === 0) continue;
      if (normalized[i] === 0) return 0;
      if ((tupleIndex & $0bb840cac04e911b$var$INTERMEDIATE_TUPLE) === 0) {
        if (normalized[i] < Math.min(0, tupleCoords[i]) || normalized[i] > Math.max(0, tupleCoords[i])) return 0;
        factor = (factor * normalized[i] + Number.EPSILON) / (tupleCoords[i] + Number.EPSILON);
      } else {
        if (normalized[i] < startCoords[i] || normalized[i] > endCoords[i]) return 0;
        else if (normalized[i] < tupleCoords[i]) factor = factor * (normalized[i] - startCoords[i] + Number.EPSILON) / (tupleCoords[i] - startCoords[i] + Number.EPSILON);
        else factor = factor * (endCoords[i] - normalized[i] + Number.EPSILON) / (endCoords[i] - tupleCoords[i] + Number.EPSILON);
      }
    }
    return factor;
  }
  // Interpolates points without delta values.
  // Needed for the 脴 and Q glyphs in Skia.
  // Algorithm from Freetype.
  interpolateMissingDeltas(points, inPoints, hasDelta) {
    if (points.length === 0) return;
    let point = 0;
    while (point < points.length) {
      let firstPoint = point;
      let endPoint = point;
      let pt = points[endPoint];
      while (!pt.endContour) pt = points[++endPoint];
      while (point <= endPoint && !hasDelta[point]) point++;
      if (point > endPoint) continue;
      let firstDelta = point;
      let curDelta = point;
      point++;
      while (point <= endPoint) {
        if (hasDelta[point]) {
          this.deltaInterpolate(curDelta + 1, point - 1, curDelta, point, inPoints, points);
          curDelta = point;
        }
        point++;
      }
      if (curDelta === firstDelta) this.deltaShift(firstPoint, endPoint, curDelta, inPoints, points);
      else {
        this.deltaInterpolate(curDelta + 1, endPoint, curDelta, firstDelta, inPoints, points);
        if (firstDelta > 0) this.deltaInterpolate(firstPoint, firstDelta - 1, curDelta, firstDelta, inPoints, points);
      }
      point = endPoint + 1;
    }
  }
  deltaInterpolate(p1, p2, ref1, ref2, inPoints, outPoints) {
    if (p1 > p2) return;
    let iterable = [
      "x",
      "y"
    ];
    for (let i = 0; i < iterable.length; i++) {
      let k = iterable[i];
      if (inPoints[ref1][k] > inPoints[ref2][k]) {
        var p = ref1;
        ref1 = ref2;
        ref2 = p;
      }
      let in1 = inPoints[ref1][k];
      let in2 = inPoints[ref2][k];
      let out1 = outPoints[ref1][k];
      let out2 = outPoints[ref2][k];
      if (in1 !== in2 || out1 === out2) {
        let scale = in1 === in2 ? 0 : (out2 - out1) / (in2 - in1);
        for (let p3 = p1; p3 <= p2; p3++) {
          let out = inPoints[p3][k];
          if (out <= in1) out += out1 - in1;
          else if (out >= in2) out += out2 - in2;
          else out = out1 + (out - in1) * scale;
          outPoints[p3][k] = out;
        }
      }
    }
  }
  deltaShift(p1, p2, ref, inPoints, outPoints) {
    let deltaX = outPoints[ref].x - inPoints[ref].x;
    let deltaY = outPoints[ref].y - inPoints[ref].y;
    if (deltaX === 0 && deltaY === 0) return;
    for (let p = p1; p <= p2; p++) if (p !== ref) {
      outPoints[p].x += deltaX;
      outPoints[p].y += deltaY;
    }
  }
  getAdvanceAdjustment(gid, table) {
    let outerIndex, innerIndex;
    if (table.advanceWidthMapping) {
      let idx = gid;
      if (idx >= table.advanceWidthMapping.mapCount) idx = table.advanceWidthMapping.mapCount - 1;
      let entryFormat = table.advanceWidthMapping.entryFormat;
      ({ outerIndex, innerIndex } = table.advanceWidthMapping.mapData[idx]);
    } else {
      outerIndex = 0;
      innerIndex = gid;
    }
    return this.getDelta(table.itemVariationStore, outerIndex, innerIndex);
  }
  // See pseudo code from `Font Variations Overview'
  // in the OpenType specification.
  getDelta(itemStore, outerIndex, innerIndex) {
    if (outerIndex >= itemStore.itemVariationData.length) return 0;
    let varData = itemStore.itemVariationData[outerIndex];
    if (innerIndex >= varData.deltaSets.length) return 0;
    let deltaSet = varData.deltaSets[innerIndex];
    let blendVector = this.getBlendVector(itemStore, outerIndex);
    let netAdjustment = 0;
    for (let master = 0; master < varData.regionIndexCount; master++) netAdjustment += deltaSet.deltas[master] * blendVector[master];
    return netAdjustment;
  }
  getBlendVector(itemStore, outerIndex) {
    let varData = itemStore.itemVariationData[outerIndex];
    if (this.blendVectors.has(varData)) return this.blendVectors.get(varData);
    let normalizedCoords = this.normalizedCoords;
    let blendVector = [];
    for (let master = 0; master < varData.regionIndexCount; master++) {
      let scalar = 1;
      let regionIndex = varData.regionIndexes[master];
      let axes = itemStore.variationRegionList.variationRegions[regionIndex];
      for (let j = 0; j < axes.length; j++) {
        let axis = axes[j];
        let axisScalar;
        if (axis.startCoord > axis.peakCoord || axis.peakCoord > axis.endCoord) axisScalar = 1;
        else if (axis.startCoord < 0 && axis.endCoord > 0 && axis.peakCoord !== 0) axisScalar = 1;
        else if (axis.peakCoord === 0) axisScalar = 1;
        else if (normalizedCoords[j] < axis.startCoord || normalizedCoords[j] > axis.endCoord) axisScalar = 0;
        else {
          if (normalizedCoords[j] === axis.peakCoord) axisScalar = 1;
          else if (normalizedCoords[j] < axis.peakCoord) axisScalar = (normalizedCoords[j] - axis.startCoord + Number.EPSILON) / (axis.peakCoord - axis.startCoord + Number.EPSILON);
          else axisScalar = (axis.endCoord - normalizedCoords[j] + Number.EPSILON) / (axis.endCoord - axis.peakCoord + Number.EPSILON);
        }
        scalar *= axisScalar;
      }
      blendVector[master] = scalar;
    }
    this.blendVectors.set(varData, blendVector);
    return blendVector;
  }
  constructor(font, coords) {
    this.font = font;
    this.normalizedCoords = this.normalizeCoords(coords);
    this.blendVectors = /* @__PURE__ */ new Map();
  }
};
var $5cc7476da92df375$var$resolved = Promise.resolve();
var $5cc7476da92df375$export$2e2bcd8739ae039 = class {
  includeGlyph(glyph) {
    if (typeof glyph === "object") glyph = glyph.id;
    if (this.mapping[glyph] == null) {
      this.glyphs.push(glyph);
      this.mapping[glyph] = this.glyphs.length - 1;
    }
    return this.mapping[glyph];
  }
  constructor(font) {
    this.font = font;
    this.glyphs = [];
    this.mapping = {};
    this.includeGlyph(0);
  }
};
var $807e58506be70005$var$ON_CURVE = 1;
var $807e58506be70005$var$X_SHORT_VECTOR = 2;
var $807e58506be70005$var$Y_SHORT_VECTOR = 4;
var $807e58506be70005$var$REPEAT = 8;
var $807e58506be70005$var$SAME_X = 16;
var $807e58506be70005$var$SAME_Y = 32;
var $807e58506be70005$var$Point = class {
  static size(val) {
    return val >= 0 && val <= 255 ? 1 : 2;
  }
  static encode(stream, value) {
    if (value >= 0 && value <= 255) stream.writeUInt8(value);
    else stream.writeInt16BE(value);
  }
};
var $807e58506be70005$var$Glyf = new Struct({
  numberOfContours: int16,
  xMin: int16,
  yMin: int16,
  xMax: int16,
  yMax: int16,
  endPtsOfContours: new ArrayT(uint16, "numberOfContours"),
  instructions: new ArrayT(uint8, uint16),
  flags: new ArrayT(uint8, 0),
  xPoints: new ArrayT($807e58506be70005$var$Point, 0),
  yPoints: new ArrayT($807e58506be70005$var$Point, 0)
});
var $807e58506be70005$export$2e2bcd8739ae039 = class {
  encodeSimple(path, instructions = []) {
    let endPtsOfContours = [];
    let xPoints = [];
    let yPoints = [];
    let flags = [];
    let same = 0;
    let lastX = 0, lastY = 0, lastFlag = 0;
    let pointCount = 0;
    for (let i = 0; i < path.commands.length; i++) {
      let c = path.commands[i];
      for (let j = 0; j < c.args.length; j += 2) {
        let x = c.args[j];
        let y = c.args[j + 1];
        let flag = 0;
        if (c.command === "quadraticCurveTo" && j === 2) {
          let next = path.commands[i + 1];
          if (next && next.command === "quadraticCurveTo") {
            let midX = (lastX + next.args[0]) / 2;
            let midY = (lastY + next.args[1]) / 2;
            if (x === midX && y === midY) continue;
          }
        }
        if (!(c.command === "quadraticCurveTo" && j === 0)) flag |= $807e58506be70005$var$ON_CURVE;
        flag = this._encodePoint(x, lastX, xPoints, flag, $807e58506be70005$var$X_SHORT_VECTOR, $807e58506be70005$var$SAME_X);
        flag = this._encodePoint(y, lastY, yPoints, flag, $807e58506be70005$var$Y_SHORT_VECTOR, $807e58506be70005$var$SAME_Y);
        if (flag === lastFlag && same < 255) {
          flags[flags.length - 1] |= $807e58506be70005$var$REPEAT;
          same++;
        } else {
          if (same > 0) {
            flags.push(same);
            same = 0;
          }
          flags.push(flag);
          lastFlag = flag;
        }
        lastX = x;
        lastY = y;
        pointCount++;
      }
      if (c.command === "closePath") endPtsOfContours.push(pointCount - 1);
    }
    if (path.commands.length > 1 && path.commands[path.commands.length - 1].command !== "closePath") endPtsOfContours.push(pointCount - 1);
    let bbox = path.bbox;
    let glyf = {
      numberOfContours: endPtsOfContours.length,
      xMin: bbox.minX,
      yMin: bbox.minY,
      xMax: bbox.maxX,
      yMax: bbox.maxY,
      endPtsOfContours,
      instructions,
      flags,
      xPoints,
      yPoints
    };
    let size = $807e58506be70005$var$Glyf.size(glyf);
    let tail = 4 - size % 4;
    let stream = new EncodeStream(size + tail);
    $807e58506be70005$var$Glyf.encode(stream, glyf);
    if (tail !== 0) stream.fill(0, tail);
    return stream.buffer;
  }
  _encodePoint(value, last, points, flag, shortFlag, sameFlag) {
    let diff = value - last;
    if (value === last) flag |= sameFlag;
    else {
      if (-255 <= diff && diff <= 255) {
        flag |= shortFlag;
        if (diff < 0) diff = -diff;
        else flag |= sameFlag;
      }
      points.push(diff);
    }
    return flag;
  }
};
var $4abbb6a5dbdc441a$export$2e2bcd8739ae039 = class extends (0, $5cc7476da92df375$export$2e2bcd8739ae039) {
  _addGlyph(gid) {
    let glyph = this.font.getGlyph(gid);
    let glyf = glyph._decode();
    let curOffset = this.font.loca.offsets[gid];
    let nextOffset = this.font.loca.offsets[gid + 1];
    let stream = this.font._getTableStream("glyf");
    stream.pos += curOffset;
    let buffer = stream.readBuffer(nextOffset - curOffset);
    if (glyf && glyf.numberOfContours < 0) {
      buffer = new Uint8Array(buffer);
      let view = new DataView(buffer.buffer);
      for (let component of glyf.components) {
        gid = this.includeGlyph(component.glyphID);
        view.setUint16(component.pos, gid);
      }
    } else if (glyf && this.font._variationProcessor)
      buffer = this.glyphEncoder.encodeSimple(glyph.path, glyf.instructions);
    this.glyf.push(buffer);
    this.loca.offsets.push(this.offset);
    this.hmtx.metrics.push({
      advance: glyph.advanceWidth,
      bearing: glyph._getMetrics().leftBearing
    });
    this.offset += buffer.length;
    return this.glyf.length - 1;
  }
  encode() {
    this.glyf = [];
    this.offset = 0;
    this.loca = {
      offsets: [],
      version: this.font.loca.version
    };
    this.hmtx = {
      metrics: [],
      bearings: []
    };
    let i = 0;
    while (i < this.glyphs.length) this._addGlyph(this.glyphs[i++]);
    let maxp = (0, import_clone.default)(this.font.maxp);
    maxp.numGlyphs = this.glyf.length;
    this.loca.offsets.push(this.offset);
    let head = (0, import_clone.default)(this.font.head);
    head.indexToLocFormat = this.loca.version;
    let hhea = (0, import_clone.default)(this.font.hhea);
    hhea.numberOfMetrics = this.hmtx.metrics.length;
    return (0, $816c07a04b6dba87$export$2e2bcd8739ae039).toBuffer({
      tables: {
        head,
        hhea,
        loca: this.loca,
        maxp,
        "cvt ": this.font["cvt "],
        prep: this.font.prep,
        glyf: this.glyf,
        hmtx: this.hmtx,
        fpgm: this.font.fpgm
      }
    });
  }
  constructor(font) {
    super(font);
    this.glyphEncoder = new (0, $807e58506be70005$export$2e2bcd8739ae039)();
  }
};
var $001d739428a71d5a$export$2e2bcd8739ae039 = class extends (0, $5cc7476da92df375$export$2e2bcd8739ae039) {
  subsetCharstrings() {
    this.charstrings = [];
    let gsubrs = {};
    for (let gid of this.glyphs) {
      this.charstrings.push(this.cff.getCharString(gid));
      let glyph = this.font.getGlyph(gid);
      let path = glyph.path;
      for (let subr in glyph._usedGsubrs) gsubrs[subr] = true;
    }
    this.gsubrs = this.subsetSubrs(this.cff.globalSubrIndex, gsubrs);
  }
  subsetSubrs(subrs, used) {
    let res = [];
    for (let i = 0; i < subrs.length; i++) {
      let subr = subrs[i];
      if (used[i]) {
        this.cff.stream.pos = subr.offset;
        res.push(this.cff.stream.readBuffer(subr.length));
      } else res.push(new Uint8Array([
        11
      ]));
    }
    return res;
  }
  subsetFontdict(topDict) {
    topDict.FDArray = [];
    topDict.FDSelect = {
      version: 0,
      fds: []
    };
    let used_fds = {};
    let used_subrs = [];
    let fd_select = {};
    for (let gid of this.glyphs) {
      let fd = this.cff.fdForGlyph(gid);
      if (fd == null) continue;
      if (!used_fds[fd]) {
        topDict.FDArray.push(Object.assign({}, this.cff.topDict.FDArray[fd]));
        used_subrs.push({});
        fd_select[fd] = topDict.FDArray.length - 1;
      }
      used_fds[fd] = true;
      topDict.FDSelect.fds.push(fd_select[fd]);
      let glyph = this.font.getGlyph(gid);
      let path = glyph.path;
      for (let subr in glyph._usedSubrs) used_subrs[fd_select[fd]][subr] = true;
    }
    for (let i = 0; i < topDict.FDArray.length; i++) {
      let dict = topDict.FDArray[i];
      delete dict.FontName;
      if (dict.Private && dict.Private.Subrs) {
        dict.Private = Object.assign({}, dict.Private);
        dict.Private.Subrs = this.subsetSubrs(dict.Private.Subrs, used_subrs[i]);
      }
    }
    return;
  }
  createCIDFontdict(topDict) {
    let used_subrs = {};
    for (let gid of this.glyphs) {
      let glyph = this.font.getGlyph(gid);
      let path = glyph.path;
      for (let subr in glyph._usedSubrs) used_subrs[subr] = true;
    }
    let privateDict = Object.assign({}, this.cff.topDict.Private);
    if (this.cff.topDict.Private && this.cff.topDict.Private.Subrs) privateDict.Subrs = this.subsetSubrs(this.cff.topDict.Private.Subrs, used_subrs);
    topDict.FDArray = [
      {
        Private: privateDict
      }
    ];
    return topDict.FDSelect = {
      version: 3,
      nRanges: 1,
      ranges: [
        {
          first: 0,
          fd: 0
        }
      ],
      sentinel: this.charstrings.length
    };
  }
  addString(string) {
    if (!string) return null;
    if (!this.strings) this.strings = [];
    this.strings.push(string);
    return (0, $229224aec43783c5$export$2e2bcd8739ae039).length + this.strings.length - 1;
  }
  encode() {
    this.subsetCharstrings();
    let charset = {
      version: this.charstrings.length > 255 ? 2 : 1,
      ranges: [
        {
          first: 1,
          nLeft: this.charstrings.length - 2
        }
      ]
    };
    let topDict = Object.assign({}, this.cff.topDict);
    topDict.Private = null;
    topDict.charset = charset;
    topDict.Encoding = null;
    topDict.CharStrings = this.charstrings;
    for (let key of [
      "version",
      "Notice",
      "Copyright",
      "FullName",
      "FamilyName",
      "Weight",
      "PostScript",
      "BaseFontName",
      "FontName"
    ]) topDict[key] = this.addString(this.cff.string(topDict[key]));
    topDict.ROS = [
      this.addString("Adobe"),
      this.addString("Identity"),
      0
    ];
    topDict.CIDCount = this.charstrings.length;
    if (this.cff.isCIDFont) this.subsetFontdict(topDict);
    else this.createCIDFontdict(topDict);
    let top = {
      version: 1,
      hdrSize: this.cff.hdrSize,
      offSize: 4,
      header: this.cff.header,
      nameIndex: [
        this.cff.postscriptName
      ],
      topDictIndex: [
        topDict
      ],
      stringIndex: this.strings,
      globalSubrIndex: this.gsubrs
    };
    return (0, $b84fd3dd9d8eddb2$export$2e2bcd8739ae039).toBuffer(top);
  }
  constructor(font) {
    super(font);
    this.cff = this.font["CFF "];
    if (!this.cff) throw new Error("Not a CFF Font");
  }
};
var $4c1709dee528ea76$export$2e2bcd8739ae039 = class _$4c1709dee528ea76$export$2e2bcd8739ae039 {
  static probe(buffer) {
    let format = (0, $12727730ddfc8bfe$export$3d28c1996ced1f14).decode(buffer.slice(0, 4));
    return format === "true" || format === "OTTO" || format === String.fromCharCode(0, 1, 0, 0);
  }
  setDefaultLanguage(lang = null) {
    this.defaultLanguage = lang;
  }
  _getTable(table) {
    if (!(table.tag in this._tables)) try {
      this._tables[table.tag] = this._decodeTable(table);
    } catch (e) {
      if ($d636bc798e7178db$export$bd5c5d8b8dcafd78) {
        console.error(`Error decoding table ${table.tag}`);
        console.error(e.stack);
      }
    }
    return this._tables[table.tag];
  }
  _getTableStream(tag) {
    let table = this.directory.tables[tag];
    if (table) {
      this.stream.pos = table.offset;
      return this.stream;
    }
    return null;
  }
  _decodeDirectory() {
    return this.directory = (0, $816c07a04b6dba87$export$2e2bcd8739ae039).decode(this.stream, {
      _startOffset: 0
    });
  }
  _decodeTable(table) {
    let pos = this.stream.pos;
    let stream = this._getTableStream(table.tag);
    let result = (0, $c3395722bea751e2$export$2e2bcd8739ae039)[table.tag].decode(stream, this, table.length);
    this.stream.pos = pos;
    return result;
  }
  /**
  * Gets a string from the font's `name` table
  * `lang` is a BCP-47 language code.
  * @return {string}
  */
  getName(key, lang = this.defaultLanguage || $d636bc798e7178db$export$42940898df819940) {
    let record = this.name && this.name.records[key];
    if (record)
      return record[lang] || record[this.defaultLanguage] || record[$d636bc798e7178db$export$42940898df819940] || record["en"] || record[Object.keys(record)[0]] || null;
    return null;
  }
  /**
  * The unique PostScript name for this font, e.g. "Helvetica-Bold"
  * @type {string}
  */
  get postscriptName() {
    return this.getName("postscriptName");
  }
  /**
  * The font's full name, e.g. "Helvetica Bold"
  * @type {string}
  */
  get fullName() {
    return this.getName("fullName");
  }
  /**
  * The font's family name, e.g. "Helvetica"
  * @type {string}
  */
  get familyName() {
    return this.getName("fontFamily");
  }
  /**
  * The font's sub-family, e.g. "Bold".
  * @type {string}
  */
  get subfamilyName() {
    return this.getName("fontSubfamily");
  }
  /**
  * The font's copyright information
  * @type {string}
  */
  get copyright() {
    return this.getName("copyright");
  }
  /**
  * The font's version number
  * @type {string}
  */
  get version() {
    return this.getName("version");
  }
  /**
  * The font鈥檚 [ascender](https://en.wikipedia.org/wiki/Ascender_(typography))
  * @type {number}
  */
  get ascent() {
    return this.hhea.ascent;
  }
  /**
  * The font鈥檚 [descender](https://en.wikipedia.org/wiki/Descender)
  * @type {number}
  */
  get descent() {
    return this.hhea.descent;
  }
  /**
  * The amount of space that should be included between lines
  * @type {number}
  */
  get lineGap() {
    return this.hhea.lineGap;
  }
  /**
  * The offset from the normal underline position that should be used
  * @type {number}
  */
  get underlinePosition() {
    return this.post.underlinePosition;
  }
  /**
  * The weight of the underline that should be used
  * @type {number}
  */
  get underlineThickness() {
    return this.post.underlineThickness;
  }
  /**
  * If this is an italic font, the angle the cursor should be drawn at to match the font design
  * @type {number}
  */
  get italicAngle() {
    return this.post.italicAngle;
  }
  /**
  * The height of capital letters above the baseline.
  * See [here](https://en.wikipedia.org/wiki/Cap_height) for more details.
  * @type {number}
  */
  get capHeight() {
    let os2 = this["OS/2"];
    return os2 ? os2.capHeight : this.ascent;
  }
  /**
  * The height of lower case letters in the font.
  * See [here](https://en.wikipedia.org/wiki/X-height) for more details.
  * @type {number}
  */
  get xHeight() {
    let os2 = this["OS/2"];
    return os2 ? os2.xHeight : 0;
  }
  /**
  * The number of glyphs in the font.
  * @type {number}
  */
  get numGlyphs() {
    return this.maxp.numGlyphs;
  }
  /**
  * The size of the font鈥檚 internal coordinate grid
  * @type {number}
  */
  get unitsPerEm() {
    return this.head.unitsPerEm;
  }
  /**
  * The font鈥檚 bounding box, i.e. the box that encloses all glyphs in the font.
  * @type {BBox}
  */
  get bbox() {
    return Object.freeze(new (0, $f34600ab9d7f70d8$export$2e2bcd8739ae039)(this.head.xMin, this.head.yMin, this.head.xMax, this.head.yMax));
  }
  get _cmapProcessor() {
    return new (0, $f08dd41ef10b694c$export$2e2bcd8739ae039)(this.cmap);
  }
  /**
  * An array of all of the unicode code points supported by the font.
  * @type {number[]}
  */
  get characterSet() {
    return this._cmapProcessor.getCharacterSet();
  }
  /**
  * Returns whether there is glyph in the font for the given unicode code point.
  *
  * @param {number} codePoint
  * @return {boolean}
  */
  hasGlyphForCodePoint(codePoint) {
    return !!this._cmapProcessor.lookup(codePoint);
  }
  /**
  * Maps a single unicode code point to a Glyph object.
  * Does not perform any advanced substitutions (there is no context to do so).
  *
  * @param {number} codePoint
  * @return {Glyph}
  */
  glyphForCodePoint(codePoint) {
    return this.getGlyph(this._cmapProcessor.lookup(codePoint), [
      codePoint
    ]);
  }
  /**
  * Returns an array of Glyph objects for the given string.
  * This is only a one-to-one mapping from characters to glyphs.
  * For most uses, you should use font.layout (described below), which
  * provides a much more advanced mapping supporting AAT and OpenType shaping.
  *
  * @param {string} string
  * @return {Glyph[]}
  */
  glyphsForString(string) {
    let glyphs = [];
    let len = string.length;
    let idx = 0;
    let last = -1;
    let state = -1;
    while (idx <= len) {
      let code = 0;
      let nextState = 0;
      if (idx < len) {
        code = string.charCodeAt(idx++);
        if (55296 <= code && code <= 56319 && idx < len) {
          let next = string.charCodeAt(idx);
          if (56320 <= next && next <= 57343) {
            idx++;
            code = ((code & 1023) << 10) + (next & 1023) + 65536;
          }
        }
        nextState = 65024 <= code && code <= 65039 || 917760 <= code && code <= 917999 ? 1 : 0;
      } else idx++;
      if (state === 0 && nextState === 1)
        glyphs.push(this.getGlyph(this._cmapProcessor.lookup(last, code), [
          last,
          code
        ]));
      else if (state === 0 && nextState === 0)
        glyphs.push(this.glyphForCodePoint(last));
      last = code;
      state = nextState;
    }
    return glyphs;
  }
  get _layoutEngine() {
    return new (0, $4c0a7fa5df7a9ab1$export$2e2bcd8739ae039)(this);
  }
  /**
  * Returns a GlyphRun object, which includes an array of Glyphs and GlyphPositions for the given string.
  *
  * @param {string} string
  * @param {string[]} [userFeatures]
  * @param {string} [script]
  * @param {string} [language]
  * @param {string} [direction]
  * @return {GlyphRun}
  */
  layout(string, userFeatures, script, language, direction) {
    return this._layoutEngine.layout(string, userFeatures, script, language, direction);
  }
  /**
  * Returns an array of strings that map to the given glyph id.
  * @param {number} gid - glyph id
  */
  stringsForGlyph(gid) {
    return this._layoutEngine.stringsForGlyph(gid);
  }
  /**
  * An array of all [OpenType feature tags](https://www.microsoft.com/typography/otspec/featuretags.htm)
  * (or mapped AAT tags) supported by the font.
  * The features parameter is an array of OpenType feature tags to be applied in addition to the default set.
  * If this is an AAT font, the OpenType feature tags are mapped to AAT features.
  *
  * @type {string[]}
  */
  get availableFeatures() {
    return this._layoutEngine.getAvailableFeatures();
  }
  getAvailableFeatures(script, language) {
    return this._layoutEngine.getAvailableFeatures(script, language);
  }
  _getBaseGlyph(glyph, characters = []) {
    if (!this._glyphs[glyph]) {
      if (this.directory.tables.glyf) this._glyphs[glyph] = new (0, $69aac16029968692$export$2e2bcd8739ae039)(glyph, characters, this);
      else if (this.directory.tables["CFF "] || this.directory.tables.CFF2) this._glyphs[glyph] = new (0, $62cc5109c6101893$export$2e2bcd8739ae039)(glyph, characters, this);
    }
    return this._glyphs[glyph] || null;
  }
  /**
  * Returns a glyph object for the given glyph id.
  * You can pass the array of code points this glyph represents for
  * your use later, and it will be stored in the glyph object.
  *
  * @param {number} glyph
  * @param {number[]} characters
  * @return {Glyph}
  */
  getGlyph(glyph, characters = []) {
    if (!this._glyphs[glyph]) {
      if (this.directory.tables.sbix) this._glyphs[glyph] = new (0, $25d8f049c222084c$export$2e2bcd8739ae039)(glyph, characters, this);
      else if (this.directory.tables.COLR && this.directory.tables.CPAL) this._glyphs[glyph] = new (0, $0d411f0165859681$export$2e2bcd8739ae039)(glyph, characters, this);
      else this._getBaseGlyph(glyph, characters);
    }
    return this._glyphs[glyph] || null;
  }
  /**
  * Returns a Subset for this font.
  * @return {Subset}
  */
  createSubset() {
    if (this.directory.tables["CFF "]) return new (0, $001d739428a71d5a$export$2e2bcd8739ae039)(this);
    return new (0, $4abbb6a5dbdc441a$export$2e2bcd8739ae039)(this);
  }
  /**
  * Returns an object describing the available variation axes
  * that this font supports. Keys are setting tags, and values
  * contain the axis name, range, and default value.
  *
  * @type {object}
  */
  get variationAxes() {
    let res = {};
    if (!this.fvar) return res;
    for (let axis of this.fvar.axis) res[axis.axisTag.trim()] = {
      name: axis.name.en,
      min: axis.minValue,
      default: axis.defaultValue,
      max: axis.maxValue
    };
    return res;
  }
  /**
  * Returns an object describing the named variation instances
  * that the font designer has specified. Keys are variation names
  * and values are the variation settings for this instance.
  *
  * @type {object}
  */
  get namedVariations() {
    let res = {};
    if (!this.fvar) return res;
    for (let instance of this.fvar.instance) {
      let settings = {};
      for (let i = 0; i < this.fvar.axis.length; i++) {
        let axis = this.fvar.axis[i];
        settings[axis.axisTag.trim()] = instance.coord[i];
      }
      res[instance.name.en] = settings;
    }
    return res;
  }
  /**
  * Returns a new font with the given variation settings applied.
  * Settings can either be an instance name, or an object containing
  * variation tags as specified by the `variationAxes` property.
  *
  * @param {object} settings
  * @return {TTFFont}
  */
  getVariation(settings) {
    if (!(this.directory.tables.fvar && (this.directory.tables.gvar && this.directory.tables.glyf || this.directory.tables.CFF2))) throw new Error("Variations require a font with the fvar, gvar and glyf, or CFF2 tables.");
    if (typeof settings === "string") settings = this.namedVariations[settings];
    if (typeof settings !== "object") throw new Error("Variation settings must be either a variation name or settings object.");
    let coords = this.fvar.axis.map((axis, i) => {
      let axisTag = axis.axisTag.trim();
      if (axisTag in settings) return Math.max(axis.minValue, Math.min(axis.maxValue, settings[axisTag]));
      else return axis.defaultValue;
    });
    let stream = new DecodeStream(this.stream.buffer);
    stream.pos = this._directoryPos;
    let font = new _$4c1709dee528ea76$export$2e2bcd8739ae039(stream, coords);
    font._tables = this._tables;
    return font;
  }
  get _variationProcessor() {
    if (!this.fvar) return null;
    let variationCoords = this.variationCoords;
    if (!variationCoords && !this.CFF2) return null;
    if (!variationCoords) variationCoords = this.fvar.axis.map((axis) => axis.defaultValue);
    return new (0, $0bb840cac04e911b$export$2e2bcd8739ae039)(this, variationCoords);
  }
  // Standardized format plugin API
  getFont(name) {
    return this.getVariation(name);
  }
  constructor(stream, variationCoords = null) {
    (0, _define_property)(this, "type", "TTF");
    this.defaultLanguage = null;
    this.stream = stream;
    this.variationCoords = variationCoords;
    this._directoryPos = this.stream.pos;
    this._tables = {};
    this._glyphs = {};
    this._decodeDirectory();
    for (let tag in this.directory.tables) {
      let table = this.directory.tables[tag];
      if ((0, $c3395722bea751e2$export$2e2bcd8739ae039)[tag] && table.length > 0) Object.defineProperty(this, tag, {
        get: this._getTable.bind(this, table)
      });
    }
  }
};
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "bbox", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "_cmapProcessor", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "characterSet", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "_layoutEngine", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "variationAxes", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "namedVariations", null);
(0, __decorate)([
  (0, $e71565f2ce09cb6b$export$69a3209f1a06c04d)
], $4c1709dee528ea76$export$2e2bcd8739ae039.prototype, "_variationProcessor", null);
var $c1726355ecc5b889$var$WOFFDirectoryEntry = new Struct({
  tag: new StringT(4),
  offset: new Pointer(uint32, "void", {
    type: "global"
  }),
  compLength: uint32,
  length: uint32,
  origChecksum: uint32
});
var $c1726355ecc5b889$var$WOFFDirectory = new Struct({
  tag: new StringT(4),
  flavor: uint32,
  length: uint32,
  numTables: uint16,
  reserved: new Reserved(uint16),
  totalSfntSize: uint32,
  majorVersion: uint16,
  minorVersion: uint16,
  metaOffset: uint32,
  metaLength: uint32,
  metaOrigLength: uint32,
  privOffset: uint32,
  privLength: uint32,
  tables: new ArrayT($c1726355ecc5b889$var$WOFFDirectoryEntry, "numTables")
});
$c1726355ecc5b889$var$WOFFDirectory.process = function() {
  let tables = {};
  for (let table of this.tables) tables[table.tag] = table;
  this.tables = tables;
};
var $c1726355ecc5b889$export$2e2bcd8739ae039 = $c1726355ecc5b889$var$WOFFDirectory;
var $760785214b9fc52c$export$2e2bcd8739ae039 = class extends (0, $4c1709dee528ea76$export$2e2bcd8739ae039) {
  static probe(buffer) {
    return (0, $12727730ddfc8bfe$export$3d28c1996ced1f14).decode(buffer.slice(0, 4)) === "wOFF";
  }
  _decodeDirectory() {
    this.directory = (0, $c1726355ecc5b889$export$2e2bcd8739ae039).decode(this.stream, {
      _startOffset: 0
    });
  }
  _getTableStream(tag) {
    let table = this.directory.tables[tag];
    if (table) {
      this.stream.pos = table.offset;
      if (table.compLength < table.length) {
        this.stream.pos += 2;
        let outBuffer = new Uint8Array(table.length);
        let buf = (0, import_tiny_inflate.default)(this.stream.readBuffer(table.compLength - 2), outBuffer);
        return new DecodeStream(buf);
      } else return this.stream;
    }
    return null;
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "WOFF");
  }
};
var $8046190c9f1ad19e$export$2e2bcd8739ae039 = class extends (0, $69aac16029968692$export$2e2bcd8739ae039) {
  _decode() {
    return this._font._transformedGlyphs[this.id];
  }
  _getCBox() {
    return this.path.bbox;
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "WOFF2");
  }
};
var $c28ec7bbb3b8de3a$var$Base128 = {
  decode(stream) {
    let result = 0;
    let iterable = [
      0,
      1,
      2,
      3,
      4
    ];
    for (let j = 0; j < iterable.length; j++) {
      let i = iterable[j];
      let code = stream.readUInt8();
      if (result & 3758096384) throw new Error("Overflow");
      result = result << 7 | code & 127;
      if ((code & 128) === 0) return result;
    }
    throw new Error("Bad base 128 number");
  }
};
var $c28ec7bbb3b8de3a$var$knownTags = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill"
];
var $c28ec7bbb3b8de3a$var$WOFF2DirectoryEntry = new Struct({
  flags: uint8,
  customTag: new Optional(new StringT(4), (t) => (t.flags & 63) === 63),
  tag: (t) => t.customTag || $c28ec7bbb3b8de3a$var$knownTags[t.flags & 63],
  length: $c28ec7bbb3b8de3a$var$Base128,
  transformVersion: (t) => t.flags >>> 6 & 3,
  transformed: (t) => t.tag === "glyf" || t.tag === "loca" ? t.transformVersion === 0 : t.transformVersion !== 0,
  transformLength: new Optional($c28ec7bbb3b8de3a$var$Base128, (t) => t.transformed)
});
var $c28ec7bbb3b8de3a$var$WOFF2Directory = new Struct({
  tag: new StringT(4),
  flavor: uint32,
  length: uint32,
  numTables: uint16,
  reserved: new Reserved(uint16),
  totalSfntSize: uint32,
  totalCompressedSize: uint32,
  majorVersion: uint16,
  minorVersion: uint16,
  metaOffset: uint32,
  metaLength: uint32,
  metaOrigLength: uint32,
  privOffset: uint32,
  privLength: uint32,
  tables: new ArrayT($c28ec7bbb3b8de3a$var$WOFF2DirectoryEntry, "numTables")
});
$c28ec7bbb3b8de3a$var$WOFF2Directory.process = function() {
  let tables = {};
  for (let i = 0; i < this.tables.length; i++) {
    let table = this.tables[i];
    tables[table.tag] = table;
  }
  return this.tables = tables;
};
var $c28ec7bbb3b8de3a$export$2e2bcd8739ae039 = $c28ec7bbb3b8de3a$var$WOFF2Directory;
var $21ee218f84ac7f32$export$2e2bcd8739ae039 = class extends (0, $4c1709dee528ea76$export$2e2bcd8739ae039) {
  static probe(buffer) {
    return (0, $12727730ddfc8bfe$export$3d28c1996ced1f14).decode(buffer.slice(0, 4)) === "wOF2";
  }
  _decodeDirectory() {
    this.directory = (0, $c28ec7bbb3b8de3a$export$2e2bcd8739ae039).decode(this.stream);
    this._dataPos = this.stream.pos;
  }
  _decompress() {
    if (!this._decompressed) {
      this.stream.pos = this._dataPos;
      let buffer = this.stream.readBuffer(this.directory.totalCompressedSize);
      let decompressedSize = 0;
      for (let tag in this.directory.tables) {
        let entry = this.directory.tables[tag];
        entry.offset = decompressedSize;
        decompressedSize += entry.transformLength != null ? entry.transformLength : entry.length;
      }
      let decompressed = (0, brotliStub)(buffer, decompressedSize);
      if (!decompressed) throw new Error("Error decoding compressed data in WOFF2");
      this.stream = new DecodeStream(decompressed);
      this._decompressed = true;
    }
  }
  _decodeTable(table) {
    this._decompress();
    return super._decodeTable(table);
  }
  // Override this method to get a glyph and return our
  // custom subclass if there is a glyf table.
  _getBaseGlyph(glyph, characters = []) {
    if (!this._glyphs[glyph]) {
      if (this.directory.tables.glyf && this.directory.tables.glyf.transformed) {
        if (!this._transformedGlyphs) this._transformGlyfTable();
        return this._glyphs[glyph] = new (0, $8046190c9f1ad19e$export$2e2bcd8739ae039)(glyph, characters, this);
      } else return super._getBaseGlyph(glyph, characters);
    }
  }
  _transformGlyfTable() {
    this._decompress();
    this.stream.pos = this.directory.tables.glyf.offset;
    let table = $21ee218f84ac7f32$var$GlyfTable.decode(this.stream);
    let glyphs = [];
    for (let index = 0; index < table.numGlyphs; index++) {
      let glyph = {};
      let nContours = table.nContours.readInt16BE();
      glyph.numberOfContours = nContours;
      if (nContours > 0) {
        let nPoints = [];
        let totalPoints = 0;
        for (let i = 0; i < nContours; i++) {
          let r = $21ee218f84ac7f32$var$read255UInt16(table.nPoints);
          totalPoints += r;
          nPoints.push(totalPoints);
        }
        glyph.points = $21ee218f84ac7f32$var$decodeTriplet(table.flags, table.glyphs, totalPoints);
        for (let i = 0; i < nContours; i++) glyph.points[nPoints[i] - 1].endContour = true;
        var instructionSize = $21ee218f84ac7f32$var$read255UInt16(table.glyphs);
      } else if (nContours < 0) {
        let haveInstructions = (0, $69aac16029968692$export$2e2bcd8739ae039).prototype._decodeComposite.call({
          _font: this
        }, glyph, table.composites);
        if (haveInstructions) var instructionSize = $21ee218f84ac7f32$var$read255UInt16(table.glyphs);
      }
      glyphs.push(glyph);
    }
    this._transformedGlyphs = glyphs;
  }
  constructor(...args) {
    super(...args);
    (0, _define_property)(this, "type", "WOFF2");
  }
};
var $21ee218f84ac7f32$var$Substream = class {
  decode(stream, parent) {
    return new DecodeStream(this._buf.decode(stream, parent));
  }
  constructor(length) {
    this.length = length;
    this._buf = new BufferT(length);
  }
};
var $21ee218f84ac7f32$var$GlyfTable = new Struct({
  version: uint32,
  numGlyphs: uint16,
  indexFormat: uint16,
  nContourStreamSize: uint32,
  nPointsStreamSize: uint32,
  flagStreamSize: uint32,
  glyphStreamSize: uint32,
  compositeStreamSize: uint32,
  bboxStreamSize: uint32,
  instructionStreamSize: uint32,
  nContours: new $21ee218f84ac7f32$var$Substream("nContourStreamSize"),
  nPoints: new $21ee218f84ac7f32$var$Substream("nPointsStreamSize"),
  flags: new $21ee218f84ac7f32$var$Substream("flagStreamSize"),
  glyphs: new $21ee218f84ac7f32$var$Substream("glyphStreamSize"),
  composites: new $21ee218f84ac7f32$var$Substream("compositeStreamSize"),
  bboxes: new $21ee218f84ac7f32$var$Substream("bboxStreamSize"),
  instructions: new $21ee218f84ac7f32$var$Substream("instructionStreamSize")
});
var $21ee218f84ac7f32$var$WORD_CODE = 253;
var $21ee218f84ac7f32$var$ONE_MORE_BYTE_CODE2 = 254;
var $21ee218f84ac7f32$var$ONE_MORE_BYTE_CODE1 = 255;
var $21ee218f84ac7f32$var$LOWEST_U_CODE = 253;
function $21ee218f84ac7f32$var$read255UInt16(stream) {
  let code = stream.readUInt8();
  if (code === $21ee218f84ac7f32$var$WORD_CODE) return stream.readUInt16BE();
  if (code === $21ee218f84ac7f32$var$ONE_MORE_BYTE_CODE1) return stream.readUInt8() + $21ee218f84ac7f32$var$LOWEST_U_CODE;
  if (code === $21ee218f84ac7f32$var$ONE_MORE_BYTE_CODE2) return stream.readUInt8() + $21ee218f84ac7f32$var$LOWEST_U_CODE * 2;
  return code;
}
function $21ee218f84ac7f32$var$withSign(flag, baseval) {
  return flag & 1 ? baseval : -baseval;
}
function $21ee218f84ac7f32$var$decodeTriplet(flags, glyphs, nPoints) {
  let y;
  let x = y = 0;
  let res = [];
  for (let i = 0; i < nPoints; i++) {
    let dx = 0, dy = 0;
    let flag = flags.readUInt8();
    let onCurve = !(flag >> 7);
    flag &= 127;
    if (flag < 10) {
      dx = 0;
      dy = $21ee218f84ac7f32$var$withSign(flag, ((flag & 14) << 7) + glyphs.readUInt8());
    } else if (flag < 20) {
      dx = $21ee218f84ac7f32$var$withSign(flag, ((flag - 10 & 14) << 7) + glyphs.readUInt8());
      dy = 0;
    } else if (flag < 84) {
      var b0 = flag - 20;
      var b1 = glyphs.readUInt8();
      dx = $21ee218f84ac7f32$var$withSign(flag, 1 + (b0 & 48) + (b1 >> 4));
      dy = $21ee218f84ac7f32$var$withSign(flag >> 1, 1 + ((b0 & 12) << 2) + (b1 & 15));
    } else if (flag < 120) {
      var b0 = flag - 84;
      dx = $21ee218f84ac7f32$var$withSign(flag, 1 + (b0 / 12 << 8) + glyphs.readUInt8());
      dy = $21ee218f84ac7f32$var$withSign(flag >> 1, 1 + (b0 % 12 >> 2 << 8) + glyphs.readUInt8());
    } else if (flag < 124) {
      var b1 = glyphs.readUInt8();
      let b2 = glyphs.readUInt8();
      dx = $21ee218f84ac7f32$var$withSign(flag, (b1 << 4) + (b2 >> 4));
      dy = $21ee218f84ac7f32$var$withSign(flag >> 1, ((b2 & 15) << 8) + glyphs.readUInt8());
    } else {
      dx = $21ee218f84ac7f32$var$withSign(flag, glyphs.readUInt16BE());
      dy = $21ee218f84ac7f32$var$withSign(flag >> 1, glyphs.readUInt16BE());
    }
    x += dx;
    y += dy;
    res.push(new (0, $69aac16029968692$export$baf26146a414f24a)(onCurve, false, x, y));
  }
  return res;
}
var $cd5853a56c68fec7$var$TTCHeader = new VersionedStruct(uint32, {
  65536: {
    numFonts: uint32,
    offsets: new ArrayT(uint32, "numFonts")
  },
  131072: {
    numFonts: uint32,
    offsets: new ArrayT(uint32, "numFonts"),
    dsigTag: uint32,
    dsigLength: uint32,
    dsigOffset: uint32
  }
});
var $cd5853a56c68fec7$export$2e2bcd8739ae039 = class {
  static probe(buffer) {
    return (0, $12727730ddfc8bfe$export$3d28c1996ced1f14).decode(buffer.slice(0, 4)) === "ttcf";
  }
  getFont(name) {
    for (let offset of this.header.offsets) {
      let stream = new DecodeStream(this.stream.buffer);
      stream.pos = offset;
      let font = new (0, $4c1709dee528ea76$export$2e2bcd8739ae039)(stream);
      if (font.postscriptName === name || font.postscriptName instanceof Uint8Array && name instanceof Uint8Array && font.postscriptName.every((v, i) => name[i] === v)) return font;
    }
    return null;
  }
  get fonts() {
    let fonts = [];
    for (let offset of this.header.offsets) {
      let stream = new DecodeStream(this.stream.buffer);
      stream.pos = offset;
      fonts.push(new (0, $4c1709dee528ea76$export$2e2bcd8739ae039)(stream));
    }
    return fonts;
  }
  constructor(stream) {
    (0, _define_property)(this, "type", "TTC");
    this.stream = stream;
    if (stream.readString(4) !== "ttcf") throw new Error("Not a TrueType collection");
    this.header = $cd5853a56c68fec7$var$TTCHeader.decode(stream);
  }
};
var $05f49f930186144e$var$DFontName = new StringT(uint8);
var $05f49f930186144e$var$DFontData = new Struct({
  len: uint32,
  buf: new BufferT("len")
});
var $05f49f930186144e$var$Ref = new Struct({
  id: uint16,
  nameOffset: int16,
  attr: uint8,
  dataOffset: uint24,
  handle: uint32
});
var $05f49f930186144e$var$Type = new Struct({
  name: new StringT(4),
  maxTypeIndex: uint16,
  refList: new Pointer(uint16, new ArrayT($05f49f930186144e$var$Ref, (t) => t.maxTypeIndex + 1), {
    type: "parent"
  })
});
var $05f49f930186144e$var$TypeList = new Struct({
  length: uint16,
  types: new ArrayT($05f49f930186144e$var$Type, (t) => t.length + 1)
});
var $05f49f930186144e$var$DFontMap = new Struct({
  reserved: new Reserved(uint8, 24),
  typeList: new Pointer(uint16, $05f49f930186144e$var$TypeList),
  nameListOffset: new Pointer(uint16, "void")
});
var $05f49f930186144e$var$DFontHeader = new Struct({
  dataOffset: uint32,
  map: new Pointer(uint32, $05f49f930186144e$var$DFontMap),
  dataLength: uint32,
  mapLength: uint32
});
var $05f49f930186144e$export$2e2bcd8739ae039 = class {
  static probe(buffer) {
    let stream = new DecodeStream(buffer);
    try {
      var header = $05f49f930186144e$var$DFontHeader.decode(stream);
    } catch (e) {
      return false;
    }
    for (let type of header.map.typeList.types) {
      if (type.name === "sfnt") return true;
    }
    return false;
  }
  getFont(name) {
    if (!this.sfnt) return null;
    for (let ref of this.sfnt.refList) {
      let pos = this.header.dataOffset + ref.dataOffset + 4;
      let stream = new DecodeStream(this.stream.buffer.slice(pos));
      let font = new (0, $4c1709dee528ea76$export$2e2bcd8739ae039)(stream);
      if (font.postscriptName === name || font.postscriptName instanceof Uint8Array && name instanceof Uint8Array && font.postscriptName.every((v, i) => name[i] === v)) return font;
    }
    return null;
  }
  get fonts() {
    let fonts = [];
    for (let ref of this.sfnt.refList) {
      let pos = this.header.dataOffset + ref.dataOffset + 4;
      let stream = new DecodeStream(this.stream.buffer.slice(pos));
      fonts.push(new (0, $4c1709dee528ea76$export$2e2bcd8739ae039)(stream));
    }
    return fonts;
  }
  constructor(stream) {
    (0, _define_property)(this, "type", "DFont");
    this.stream = stream;
    this.header = $05f49f930186144e$var$DFontHeader.decode(this.stream);
    for (let type of this.header.map.typeList.types) {
      for (let ref of type.refList) if (ref.nameOffset >= 0) {
        this.stream.pos = ref.nameOffset + this.header.map.nameListOffset;
        ref.name = $05f49f930186144e$var$DFontName.decode(this.stream);
      } else ref.name = null;
      if (type.name === "sfnt") this.sfnt = type;
    }
  }
};
(0, $d636bc798e7178db$export$36b2f24e97d43be)((0, $4c1709dee528ea76$export$2e2bcd8739ae039));
(0, $d636bc798e7178db$export$36b2f24e97d43be)((0, $760785214b9fc52c$export$2e2bcd8739ae039));
(0, $d636bc798e7178db$export$36b2f24e97d43be)((0, $21ee218f84ac7f32$export$2e2bcd8739ae039));
(0, $d636bc798e7178db$export$36b2f24e97d43be)((0, $cd5853a56c68fec7$export$2e2bcd8739ae039));
(0, $d636bc798e7178db$export$36b2f24e97d43be)((0, $05f49f930186144e$export$2e2bcd8739ae039));
export {
  $d636bc798e7178db$export$185802fd694ee1f5 as create,
  $d636bc798e7178db$export$42940898df819940 as defaultLanguage,
  $d636bc798e7178db$export$bd5c5d8b8dcafd78 as logErrors,
  $d636bc798e7178db$export$36b2f24e97d43be as registerFormat,
  $d636bc798e7178db$export$5157e7780d44cc36 as setDefaultLanguage
};

