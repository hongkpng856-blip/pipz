import Foundation

// MARK: - 顏色工具

enum HexColor {
    static func components(_ hex: UInt32) -> (r: Double, g: Double, b: Double) {
        (
            Double((hex >> 16) & 0xFF) / 255.0,
            Double((hex >> 8) & 0xFF) / 255.0,
            Double(hex & 0xFF) / 255.0
        )
    }

    static func pack(_ r: Double, _ g: Double, _ b: Double) -> UInt32 {
        let ri = UInt32(max(0, min(255, (r * 255).rounded())))
        let gi = UInt32(max(0, min(255, (g * 255).rounded())))
        let bi = UInt32(max(0, min(255, (b * 255).rounded())))
        return (ri << 16) | (gi << 8) | bi
    }

    static func mix(_ a: UInt32, _ b: UInt32, _ t: Double) -> UInt32 {
        let ca = components(a)
        let cb = components(b)
        let k = max(0, min(1, t))
        return pack(ca.r + (cb.r - ca.r) * k, ca.g + (cb.g - ca.g) * k, ca.b + (cb.b - ca.b) * k)
    }

    static func lighten(_ c: UInt32, _ t: Double) -> UInt32 { mix(c, 0xFFFFFF, t) }
    static func darken(_ c: UInt32, _ t: Double) -> UInt32 { mix(c, 0x000000, t) }
}

// MARK: - Sprite

struct PixelSprite: Equatable {
    let width: Int
    let height: Int
    /// 0 = 透明，1... 對應 palette index
    let pixels: [UInt8]
    /// index 0 無用；1 開始
    let palette: [UInt32]

    static let empty = PixelSprite(width: 1, height: 1, pixels: [0], palette: [0, 0x000000])

    func pixel(_ x: Int, _ y: Int) -> UInt8 {
        guard x >= 0, y >= 0, x < width, y < height else { return 0 }
        return pixels[y * width + x]
    }
}

// MARK: - 畫格

struct PixelGrid {
    let width: Int
    let height: Int
    var pixels: [UInt8]

    init(width: Int = 20, height: Int = 20) {
        self.width = max(1, width)
        self.height = max(1, height)
        self.pixels = Array(repeating: 0, count: self.width * self.height)
    }

    mutating func set(_ x: Int, _ y: Int, _ value: UInt8) {
        guard x >= 0, y >= 0, x < width, y < height, value != 0 else { return }
        pixels[y * width + x] = value
    }

    mutating func clear(_ x: Int, _ y: Int) {
        guard x >= 0, y >= 0, x < width, y < height else { return }
        pixels[y * width + x] = 0
    }

    func isFilled(_ x: Int, _ y: Int) -> Bool {
        guard x >= 0, y >= 0, x < width, y < height else { return false }
        return pixels[y * width + x] != 0
    }

    /// 左右對稱落筆（x 同 width-1-x）
    mutating func setSym(_ x: Int, _ y: Int, _ value: UInt8) {
        set(x, y, value)
        set(width - 1 - x, y, value)
    }

    mutating func hLine(_ y: Int, _ x0: Int, _ x1: Int, _ value: UInt8) {
        guard x0 <= x1 else { return }
        for x in x0...x1 { set(x, y, value) }
    }

    mutating func vLine(_ x: Int, _ y0: Int, _ y1: Int, _ value: UInt8) {
        guard y0 <= y1 else { return }
        for y in y0...y1 { set(x, y, value) }
    }

    mutating func rect(_ x0: Int, _ y0: Int, _ x1: Int, _ y1: Int, _ value: UInt8) {
        guard x0 <= x1, y0 <= y1 else { return }
        for y in y0...y1 { hLine(y, x0, x1, value) }
    }

    mutating func ellipse(_ cx: Int, _ cy: Int, _ rx: Int, _ ry: Int, _ value: UInt8) {
        guard rx > 0, ry > 0 else { return }
        for y in (cy - ry)...(cy + ry) {
            for x in (cx - rx)...(cx + rx) {
                let dx = Double(x - cx) / Double(rx)
                let dy = Double(y - cy) / Double(ry)
                if dx * dx + dy * dy <= 1.0 { set(x, y, value) }
            }
        }
    }

    /// 梯形（闊度由 topHalf 漸變到 botHalf）
    mutating func trapezoid(_ cx: Int, _ yTop: Int, _ yBot: Int, _ topHalf: Int, _ botHalf: Int, _ value: UInt8) {
        guard yTop <= yBot else { return }
        let span = max(1, yBot - yTop)
        for y in yTop...yBot {
            let t = Double(y - yTop) / Double(span)
            let hw = Int((Double(topHalf) + (Double(botHalf) - Double(topHalf)) * t).rounded())
            hLine(y, cx - hw, cx + hw, value)
        }
    }

    /// 對已填色區域加一圈外框
    mutating func outline(_ value: UInt8) {
        var targets: [(Int, Int)] = []
        for y in 0..<height {
            for x in 0..<width where !isFilled(x, y) {
                if isFilled(x - 1, y) || isFilled(x + 1, y) || isFilled(x, y - 1) || isFilled(x, y + 1) {
                    targets.append((x, y))
                }
            }
        }
        for (x, y) in targets { set(x, y, value) }
    }

    /// 將成個圖案推入畫布中間，保證唔會被邊緣切斷（留 margin 邊）
    mutating func fitInside(margin: Int = 2) {
        var minX = width
        var minY = height
        var maxX = -1
        var maxY = -1
        for y in 0..<height {
            for x in 0..<width where isFilled(x, y) {
                minX = min(minX, x)
                maxX = max(maxX, x)
                minY = min(minY, y)
                maxY = max(maxY, y)
            }
        }
        guard maxX >= 0 else { return }

        var dx = 0
        var dy = 0
        if minX < margin {
            dx = margin - minX
        } else if maxX > width - 1 - margin {
            dx = (width - 1 - margin) - maxX
        }
        if minY < margin {
            dy = margin - minY
        } else if maxY > height - 1 - margin {
            dy = (height - 1 - margin) - maxY
        }
        guard dx != 0 || dy != 0 else { return }

        var shifted = [UInt8](repeating: 0, count: pixels.count)
        for y in 0..<height {
            for x in 0..<width where isFilled(x, y) {
                let nx = x + dx
                let ny = y + dy
                if nx >= 0, ny >= 0, nx < width, ny < height {
                    shifted[ny * width + nx] = pixels[y * width + x]
                }
            }
        }
        pixels = shifted
    }

    /// 上光下暗：每一直行最頂嘅主色變高光、最底嘅變陰影（令死物有立體感）
    mutating func shadeColumns() {
        for x in 0..<width {
            var topY = -1
            var botY = -1
            for y in 0..<height where isFilled(x, y) {
                if topY < 0 { topY = y }
                botY = y
            }
            if topY >= 0, pixels[topY * width + x] == PaletteSlot.main {
                pixels[topY * width + x] = PaletteSlot.light
            }
            if botY >= 0, pixels[botY * width + x] == PaletteSlot.main {
                pixels[botY * width + x] = PaletteSlot.dark
            }
        }
    }

    func toSprite(palette: [UInt32]) -> PixelSprite {
        PixelSprite(width: width, height: height, pixels: pixels, palette: palette)
    }
}

// MARK: - 調色盤（index 對應）

enum PaletteSlot {
    static let main: UInt8 = 1
    static let light: UInt8 = 2
    static let dark: UInt8 = 3
    static let outline: UInt8 = 4
    static let accent: UInt8 = 5
    static let accent2: UInt8 = 6
    static let eye: UInt8 = 7
    static let shine: UInt8 = 8
    static let glow: UInt8 = 9
}

enum SpritePalette {
    /// 分類 → 主色候選
    static func baseColors(for category: ItemCategory) -> [UInt32] {
        switch category {
        case .animal:
            return [0xB08968, 0x9AA07A, 0xC7A98F, 0x8E9BA8, 0xD8C3A5, 0x7E8C6A, 0xC98F7A, 0xA8A29E]
        case .household:
            return [0xE6E1D6, 0xA8BCB0, 0x9FB0C4, 0xD9C3A5, 0xB9A8B0, 0x8FA0A8, 0xCBB99A, 0xE0D2BE]
        case .food:
            return [0xE8B96B, 0xD9736B, 0xC9A227, 0xE9DCC0, 0xB7744B, 0xD8A0A8, 0xA8B84B, 0xE4C08C]
        case .plant:
            return [0x6FA35F, 0x4F8A54, 0x86B26B, 0x3F6B4A, 0x9BC07A, 0x5E8F6A, 0x7AA860, 0x47774F]
        case .tool:
            return [0x9AA3AD, 0x7C858F, 0xB4BCC4, 0xC9A227, 0x8A8F96, 0xA69E8C, 0x6E767E, 0xD0D4D8]
        case .oddity:
            return [0x8B6FB0, 0x5E7F9E, 0xA070A8, 0x6E8F8A, 0x9A6E8E, 0x7A7F9E, 0xB08FA8, 0x6A6E8A]
        }
    }

    static func make(category: ItemCategory, rarity: Rarity, rng: inout SeededRandom) -> [UInt32] {
        let pool = baseColors(for: category)
        let base = pool[rng.int(pool.count)]
        // 稀有度影響鮮艷度
        let satBoost = [0.10, 0.03, 0.0, -0.05, -0.08][rarity.rawValue]
        let main = HexColor.mix(base, rarity.tintHex, satBoost)
        let light = HexColor.lighten(main, 0.35)
        let dark = HexColor.darken(main, 0.30)
        let outline = HexColor.darken(main, 0.68)
        let accentPool: [UInt32] = category == .oddity
            ? [0xE0A0F0, 0x80E8D0, 0xFFD166]
            : [0xE07A5F, 0x81B29A, 0xF2CC8F, 0x6B8CAE, 0xD98CA8, 0xC9A227]
        let accent = accentPool[rng.int(accentPool.count)]
        let accent2 = HexColor.lighten(accent, 0.25)
        let eye = HexColor.darken(base, 0.75)
        var palette: [UInt32] = [0, main, light, dark, outline, accent, accent2, eye, 0xF7F3E8, rarity.tintHex]
        // 9 = glow，只有 epic/legendary 才發亮
        if rarity >= .epic {
            palette[9] = HexColor.lighten(rarity.tintHex, 0.15)
        } else {
            palette[9] = HexColor.mix(rarity.tintHex, 0x101420, 0.45)
        }
        return palette
    }
}
