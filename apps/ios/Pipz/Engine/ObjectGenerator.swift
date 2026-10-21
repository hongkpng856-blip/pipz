import Foundation

// MARK: - 對稱畫法（20x20 格，中軸喺 9 / 10 之間）

private extension PixelGrid {
    mutating func symHLine(_ y: Int, half: Int, _ v: UInt8) {
        hLine(y, 9 - half, 10 + half, v)
    }

    mutating func symRect(_ y0: Int, _ y1: Int, half: Int, _ v: UInt8) {
        guard y0 <= y1 else { return }
        for y in y0...y1 { symHLine(y, half: half, v) }
    }

    mutating func symEllipse(_ cy: Int, rx: Int, ry: Int, _ v: UInt8) {
        ellipse(9, cy, rx, ry, v)
        ellipse(10, cy, rx, ry, v)
    }

    mutating func symTrapezoid(_ yTop: Int, _ yBot: Int, topHalf: Int, botHalf: Int, _ v: UInt8) {
        guard yTop <= yBot else { return }
        let span = max(1, yBot - yTop)
        for y in yTop...yBot {
            let t = Double(y - yTop) / Double(span)
            let hw = Int((Double(topHalf) + (Double(botHalf) - Double(topHalf)) * t).rounded())
            symHLine(y, half: max(0, hw), v)
        }
    }
}

// MARK: - 生成器

enum ObjectGenerator {

    static func sprite(seed: UInt64, category: ItemCategory, stage: Int, rarity: Rarity,
                       hints: AIHints? = nil) -> PixelSprite {
        var rng = SeededRandom(seed: seed)
        let palette = SpritePalette.make(
            category: category, rarity: rarity, rng: &rng, baseColor: hints?.paletteHex
        )
        let grow = max(0, min(Growth.maxStage, stage))
        let forcedShape = hints?.archetype.flatMap { shape(named: $0) }
        let wantsCreature = hints?.archetype == nil || hints?.archetype == "creature"

        var grid: PixelGrid
        if let forcedShape {
            grid = object(&rng, stage: grow, category: category,
                          forcedShape: forcedShape, patternForce: hints?.pattern)
        } else if wantsCreature && (category == .animal || category == .oddity) {
            grid = creature(&rng, stage: grow, oddity: category == .oddity,
                            earOverride: hints?.ear, patternForce: hints?.pattern)
        } else {
            switch category {
            case .animal:
                grid = creature(&rng, stage: grow, oddity: false,
                                earOverride: hints?.ear, patternForce: hints?.pattern)
            case .oddity:
                grid = creature(&rng, stage: grow, oddity: true,
                                earOverride: hints?.ear, patternForce: hints?.pattern)
            case .household, .food, .plant, .tool:
                grid = object(&rng, stage: grow, category: category, patternForce: hints?.pattern)
            }
        }

        let drawn = grid.pixels.contains { $0 != 0 }
        if !drawn {
            grid = blobShape(&rng, stage: grow)
        }

        grid.fitInside(margin: 1)

        if rarity >= .epic && grow >= 2 {
            grid.outline(PaletteSlot.glow)
        } else {
            grid.outline(PaletteSlot.outline)
        }
        return grid.toSprite(palette: palette)
    }

    // MARK: 生物

    private static func creature(_ rng: inout SeededRandom, stage: Int, oddity: Bool,
                                 earOverride: Int? = nil, patternForce: Int? = nil) -> PixelGrid {
        var g = PixelGrid(width: 20, height: 20)
        let grow = stage
        let big = grow >= 2

        // 垂直預算：內容最多佔 y 1...17，外框之後 0...18，唔會被切
        let bodyCY = big ? 12 : 13
        let bodyRY = big ? 4 : 3 + rng.int(0, 1)
        let bodyRX = big ? 5 + rng.int(0, 1) : 4 + rng.int(0, 1)
        let headR = 2 + rng.int(0, 1) + (big ? 1 : 0)
        let headCY = bodyCY - bodyRY - headR + 2

        // 身體
        g.symEllipse(bodyCY, rx: bodyRX, ry: bodyRY, PaletteSlot.main)
        // 頭
        g.symEllipse(headCY, rx: headR, ry: headR, PaletteSlot.main)
        // 頸／接合位
        if headCY + headR < bodyCY - bodyRY + 1 {
            g.symRect(headCY + headR, bodyCY - bodyRY + 1, half: max(1, headR - 1), PaletteSlot.main)
        }

        // 耳／角／觸鬚
        let earKind = earOverride ?? rng.int(0, oddity ? 4 : 3)
        drawEars(&g, kind: earKind, headCY: headCY, headR: headR, grow: grow)

        // 眼
        let eyeX = 9 - headR + 1
        if oddity && rng.chance(0.4) {
            g.setSym(eyeX, headCY, PaletteSlot.eye)
        } else {
            g.setSym(eyeX, headCY, PaletteSlot.eye)
            if rng.chance(0.35) {
                g.setSym(eyeX - 1, headCY, PaletteSlot.eye)
            }
        }
        if grow >= 1 || rng.chance(0.3) {
            g.set(9 - headR + 2, headCY - 1, PaletteSlot.shine)
            g.set(10 + headR - 2, headCY - 1, PaletteSlot.shine)
        }

        // 腳
        let legCount = (bodyRX >= 5 || big) ? 4 : 2
        let legTop = bodyCY + bodyRY
        let legBot = min(17, legTop + 2)
        let outerX = 9 - bodyRX + 2
        g.vLine(outerX, legTop, legBot, PaletteSlot.dark)
        g.vLine(19 - outerX, legTop, legBot, PaletteSlot.dark)
        if legCount == 4 {
            let innerX = 9 - 1
            g.vLine(innerX, legTop, legBot, PaletteSlot.dark)
            g.vLine(19 - innerX, legTop, legBot, PaletteSlot.dark)
        }

        // 尾
        let tailKind = rng.int(0, 3)
        if tailKind > 0 && !oddity {
            let tx = 9 - bodyRX - 1
            switch tailKind {
            case 1:
                g.setSym(tx, bodyCY + 1, PaletteSlot.main)
                g.setSym(tx, bodyCY + 2, PaletteSlot.main)
            case 2:
                g.setSym(tx, bodyCY, PaletteSlot.main)
                g.setSym(tx - 1, bodyCY - 1, PaletteSlot.main)
            default:
                g.hLine(bodyCY + 2, max(1, tx - 1), 9 - bodyRX, PaletteSlot.dark)
                g.hLine(bodyCY + 2, 10 + bodyRX, min(18, 20 - tx), PaletteSlot.dark)
            }
        }

        // 花紋
        if patternForce == 1 || grow >= 1 || rng.chance(0.45) {
            let spots = 2 + rng.int(0, 3)
            var k = 0
            while k < spots {
                let sx = rng.int(9 - bodyRX + 1, 9)
                let sy = rng.int(bodyCY - bodyRY + 1, bodyCY + bodyRY - 1)
                if g.isFilled(sx, sy) {
                    g.setSym(sx, sy, PaletteSlot.accent)
                }
                k += 1
            }
        }

        // 翼（成熟之後）
        if grow >= 3 && rng.chance(0.6) {
            let wx = 9 - bodyRX - 1
            g.setSym(wx, bodyCY - 2, PaletteSlot.light)
            g.setSym(wx, bodyCY - 1, PaletteSlot.light)
            g.setSym(wx + 1, bodyCY - 3, PaletteSlot.light)
        }

        // 頭頂高光
        if grow >= 2 {
            g.set(9 - headR + 1, headCY - headR + 1, PaletteSlot.light)
            g.set(10 + headR - 1, headCY - headR + 1, PaletteSlot.light)
        }

        return g
    }

    private static func drawEars(_ g: inout PixelGrid, kind: Int, headCY: Int, headR: Int, grow: Int) {
        let baseX = 9 - headR + 1
        let topY = max(1, headCY - headR)
        switch kind {
        case 0:
            break
        case 1: // 尖耳
            g.setSym(baseX + 1, max(1, topY - 1), PaletteSlot.main)
            g.setSym(baseX, max(1, topY - 2), PaletteSlot.main)
            g.setSym(baseX + 1, max(1, topY - 2), PaletteSlot.main)
        case 2: // 圓耳
            g.setSym(baseX, max(1, topY - 1), PaletteSlot.main)
            g.setSym(baseX + 1, max(1, topY - 1), PaletteSlot.main)
            g.setSym(baseX, topY, PaletteSlot.main)
        case 3: // 觸鬚
            g.vLine(baseX, max(1, topY - 2), max(1, topY - 1), PaletteSlot.dark)
            g.vLine(19 - baseX, max(1, topY - 2), max(1, topY - 1), PaletteSlot.dark)
            g.setSym(baseX, max(1, topY - 2), PaletteSlot.accent)
        default: // 單角
            g.vLine(9, max(1, topY - 2), max(1, topY - 1), PaletteSlot.accent)
            g.vLine(10, max(1, topY - 2), max(1, topY - 1), PaletteSlot.accent)
            if grow >= 2 {
                g.set(9, max(1, topY - 2), PaletteSlot.accent2)
                g.set(10, max(1, topY - 2), PaletteSlot.accent2)
            }
        }
    }

    // MARK: 死物

    private enum Shape: Int, CaseIterable {
        case cup
        case bottle
        case lamp
        case clock
        case box
        case chair
        case brush
        case blob
    }

    private static func shapes(for category: ItemCategory) -> [Shape] {
        switch category {
        case .household: return [.cup, .bottle, .lamp, .clock, .box, .chair, .brush, .blob]
        case .food: return [.cup, .blob, .box, .bottle]
        case .plant: return [.bottle, .blob, .cup]
        case .tool: return [.brush, .box, .lamp, .chair]
        case .animal, .oddity: return [.blob, .lamp, .clock]
        }
    }

    private static func shape(named name: String) -> Shape? {
        switch name.lowercased() {
        case "creature": return nil
        case "cup": return .cup
        case "bottle": return .bottle
        case "lamp": return .lamp
        case "clock": return .clock
        case "box": return .box
        case "chair": return .chair
        case "brush": return .brush
        case "blob": return .blob
        default: return nil
        }
    }

    private static func object(_ rng: inout SeededRandom, stage: Int, category: ItemCategory,
                               forcedShape: Shape? = nil, patternForce: Int? = nil) -> PixelGrid {
        let options = shapes(for: category)
        let shape = forcedShape ?? options[rng.int(options.count)]
        var g: PixelGrid
        switch shape {
        case .cup: g = cupShape(&rng, stage: stage)
        case .bottle: g = bottleShape(&rng, stage: stage)
        case .lamp: g = lampShape(&rng, stage: stage)
        case .clock: g = clockShape(&rng, stage: stage)
        case .box: g = boxShape(&rng, stage: stage)
        case .chair: g = chairShape(&rng, stage: stage)
        case .brush: g = brushShape(&rng, stage: stage)
        case .blob: g = blobShape(&rng, stage: stage)
        }
        // 成熟之後加裝飾點（AI 指定 pattern 就一定有）
        if patternForce == 1 || (stage >= 1 && rng.chance(0.7)) {
            let dots = 1 + rng.int(0, 2)
            var k = 0
            while k < dots {
                let x = rng.int(5, 14)
                let y = rng.int(7, 16)
                if g.isFilled(x, y) {
                    g.set(x, y, PaletteSlot.accent)
                }
                k += 1
            }
        }
        g.shadeColumns()
        return g
    }

    private static func cupShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let topY = 7 + rng.int(0, 2)
        let botY = min(17, topY + 5 + rng.int(0, 2))
        let topHalf = 4 + rng.int(0, 1)
        let botHalf = max(1, topHalf - 2 - rng.int(0, 1))
        g.symTrapezoid(topY, botY, topHalf: topHalf, botHalf: botHalf, PaletteSlot.main)
        g.symHLine(topY, half: topHalf, PaletteSlot.light)
        g.symHLine(min(19, topY + 1), half: max(0, topHalf - 1), PaletteSlot.dark)
        g.symHLine(botY, half: botHalf, PaletteSlot.dark)
        if rng.chance(0.6) {
            let hx = 10 + topHalf + 1
            g.vLine(hx, topY + 2, topY + 4, PaletteSlot.dark)
            g.set(hx + 1, topY + 2, PaletteSlot.dark)
            g.set(hx + 1, topY + 4, PaletteSlot.dark)
        }
        if stage >= 2 {
            g.symHLine(topY, half: max(0, topHalf - 2), PaletteSlot.accent)
        }
        return g
    }

    private static func bottleShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let bodyCY = 13 + rng.int(0, 1)
        let bodyRX = 3 + rng.int(0, 2)
        let bodyRY = 3 + rng.int(0, 1)
        g.symEllipse(bodyCY, rx: bodyRX, ry: bodyRY, PaletteSlot.main)
        let neckHalf = 1 + rng.int(0, 1)
        let neckTop = max(1, bodyCY - bodyRY - 4)
        g.symRect(neckTop, bodyCY - bodyRY + 1, half: neckHalf, PaletteSlot.main)
        g.symHLine(max(0, neckTop - 1), half: neckHalf + 1, PaletteSlot.accent)
        g.set(9 - bodyRX + 1, bodyCY - 1, PaletteSlot.light)
        g.set(10 + bodyRX - 1, bodyCY - 1, PaletteSlot.light)
        if stage >= 2 {
            g.symHLine(bodyCY + bodyRY - 1, half: bodyRX - 2, PaletteSlot.accent2)
        }
        return g
    }

    private static func lampShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let shadeTop = 3 + rng.int(0, 1)
        let shadeBot = shadeTop + 4 + rng.int(0, 1)
        let topHalf = 2 + rng.int(0, 1)
        let botHalf = 4 + rng.int(0, 1)
        g.symTrapezoid(shadeTop, shadeBot, topHalf: topHalf, botHalf: botHalf, PaletteSlot.main)
        g.symHLine(shadeBot, half: botHalf, PaletteSlot.light)
        g.vLine(9, shadeBot + 1, 16, PaletteSlot.dark)
        g.vLine(10, shadeBot + 1, 16, PaletteSlot.dark)
        g.symEllipse(17, rx: 3, ry: 1, PaletteSlot.dark)
        g.symHLine(shadeTop, half: topHalf, PaletteSlot.accent)
        if stage >= 2 {
            g.setSym(9 - botHalf + 1, shadeTop + 2, PaletteSlot.accent2)
        }
        return g
    }

    private static func clockShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let r = 5 + rng.int(0, 1)
        let cy = 9 + rng.int(0, 1)
        g.symEllipse(cy, rx: r, ry: r, PaletteSlot.main)
        g.symEllipse(cy, rx: r - 1, ry: r - 1, PaletteSlot.light)
        g.symEllipse(cy, rx: max(1, r - 3), ry: max(1, r - 3), PaletteSlot.main)
        g.vLine(9, cy - 3, cy, PaletteSlot.eye)
        g.vLine(10, cy - 3, cy, PaletteSlot.eye)
        g.hLine(cy, 9, 9 + 3, PaletteSlot.eye)
        g.hLine(cy, 10, 10 + 3, PaletteSlot.eye)
        g.set(9, cy - 3, PaletteSlot.accent)
        g.set(10, cy - 3, PaletteSlot.accent)
        if stage >= 2 {
            g.vLine(9, cy + r, min(18, cy + r + 1), PaletteSlot.dark)
            g.vLine(10, cy + r, min(18, cy + r + 1), PaletteSlot.dark)
        }
        return g
    }

    private static func boxShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let y0 = 6 + rng.int(0, 2)
        let y1 = min(16, y0 + 6 + rng.int(0, 1))
        let half = 4 + rng.int(0, 1)
        g.symRect(y0, y1, half: half, PaletteSlot.main)
        // 蓋
        g.symRect(y0, y0 + 1, half: half + 1, PaletteSlot.light)
        g.symHLine(y0 + 2, half: half, PaletteSlot.dark)
        // 標籤 / 束帶
        g.symHLine(y0 + 4, half: max(0, half - 2), PaletteSlot.accent)
        // 邊
        g.vLine(9 - half, y0 + 3, y1, PaletteSlot.dark)
        g.vLine(10 + half, y0 + 3, y1, PaletteSlot.dark)
        g.symHLine(y1, half: half, PaletteSlot.dark)
        // 蓋頂掣（鈕）
        g.set(9, max(0, y0 - 1), PaletteSlot.accent)
        g.set(10, max(0, y0 - 1), PaletteSlot.accent)
        if stage >= 2 {
            g.symHLine(y0 + 6, half: max(0, half - 1), PaletteSlot.accent2)
        }
        return g
    }

    private static func chairShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let half = 4 + rng.int(0, 1)
        g.symRect(6, 9, half: half, PaletteSlot.main)
        g.symRect(10, 11, half: half + 1, PaletteSlot.light)
        for x in [9 - half - 1, 9 - half + 2, 10 + half - 2, 10 + half + 1] {
            g.vLine(x, 12, 17, PaletteSlot.dark)
        }
        if stage >= 2 {
            g.symHLine(9, half: half - 2, PaletteSlot.accent)
        }
        return g
    }

    private static func brushShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let handleLen = 7 + rng.int(0, 2)
        for i in 0..<handleLen {
            g.set(5 + i, min(18, 17 - i), PaletteSlot.dark)
            g.set(6 + i, min(18, 17 - i), PaletteSlot.dark)
        }
        let hx = min(15, 5 + handleLen - 2)
        g.rect(hx, 4, min(18, hx + 3), 8, PaletteSlot.main)
        g.rect(hx, 7, min(18, hx + 3), 8, PaletteSlot.accent)
        if stage >= 2 {
            g.rect(min(18, hx + 1), 5, min(18, hx + 2), 6, PaletteSlot.light)
        }
        return g
    }

    private static func blobShape(_ rng: inout SeededRandom, stage: Int) -> PixelGrid {
        var g = PixelGrid()
        let cy = 12 + rng.int(0, 1)
        let rx = 4 + rng.int(0, 1) + (stage >= 2 ? 1 : 0)
        let ry = 3 + rng.int(0, 1)
        g.symEllipse(cy, rx: rx, ry: ry, PaletteSlot.main)
        g.symEllipse(cy - ry + 1, rx: max(1, rx - 2), ry: max(1, ry - 2), PaletteSlot.light)
        // 莖／頂
        g.vLine(9, max(0, cy - ry - 2), max(0, cy - ry), PaletteSlot.dark)
        g.vLine(10, max(0, cy - ry - 2), max(0, cy - ry), PaletteSlot.dark)
        g.ellipse(9, max(0, cy - ry - 2), 2, 1, PaletteSlot.accent)
        g.ellipse(10, max(0, cy - ry - 2), 2, 1, PaletteSlot.accent)
        if stage >= 1 {
            let dots = 1 + rng.int(0, 2)
            var k = 0
            while k < dots {
                let x = rng.int(9 - rx + 1, 9 + rx - 1)
                let y = rng.int(cy - ry + 1, cy + ry - 1)
                if g.isFilled(x, y) {
                    g.set(x, y, PaletteSlot.accent2)
                }
                k += 1
            }
        }
        return g
    }
}
