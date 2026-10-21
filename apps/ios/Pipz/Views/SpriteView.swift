import SwiftUI

/// 將 PixelSprite 畫出嚟（逐行 run 合併，避免格與格之間出現白線）
struct PixelSpriteView: View {
    let sprite: PixelSprite
    var background: Color? = nil

    var body: some View {
        ZStack {
            if let background {
                background
            }
            Canvas { context, size in
                let cols = CGFloat(max(1, sprite.width))
                let rows = CGFloat(max(1, sprite.height))
                let cell = min(size.width / cols, size.height / rows)
                let originX = (size.width - cell * cols) / 2
                let originY = (size.height - cell * rows) / 2

                for y in 0..<sprite.height {
                    var x = 0
                    while x < sprite.width {
                        let value = sprite.pixel(x, y)
                        if value == 0 {
                            x += 1
                            continue
                        }
                        var run = 1
                        while x + run < sprite.width, sprite.pixel(x + run, y) == value {
                            run += 1
                        }
                        let index = Int(value)
                        if index < sprite.palette.count {
                            let rect = CGRect(
                                x: originX + CGFloat(x) * cell,
                                y: originY + CGFloat(y) * cell,
                                width: CGFloat(run) * cell + 0.5,
                                height: cell + 0.5
                            )
                            context.fill(Path(rect), with: .color(Color(hex: sprite.palette[index])))
                        }
                        x += run
                    }
                }
            }
        }
        .aspectRatio(CGFloat(sprite.width) / CGFloat(sprite.height), contentMode: .fit)
    }
}

/// 便利 view：由 item 直接生成
struct ItemSpriteView: View {
    let item: DiscoveredItem
    var size: CGFloat = 84

    private var sprite: PixelSprite {
        ObjectGenerator.sprite(
            seed: item.discoverySeed,
            category: item.category,
            stage: item.stage,
            rarity: item.rarity,
            hints: item.hints
        )
    }

    var body: some View {
        PixelSpriteView(sprite: sprite)
            .frame(width: size, height: size)
    }
}

/// 用 seed 直接畫（測試面板用）
struct SeededSpriteView: View {
    let seed: UInt64
    let category: ItemCategory
    let rarity: Rarity
    let stage: Int
    var size: CGFloat = 64

    var body: some View {
        PixelSpriteView(
            sprite: ObjectGenerator.sprite(seed: seed, category: category, stage: stage, rarity: rarity)
        )
        .frame(width: size, height: size)
    }
}
