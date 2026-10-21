import Foundation

// MARK: - 分類

enum ItemCategory: String, Codable, CaseIterable, Identifiable {
    case animal
    case household
    case food
    case plant
    case tool
    case oddity

    var id: String { rawValue }

    var label: String {
        switch self {
        case .animal: return "動物"
        case .household: return "家居"
        case .food: return "食物"
        case .plant: return "植物"
        case .tool: return "工具"
        case .oddity: return "怪奇"
        }
    }

    var glyph: String {
        switch self {
        case .animal: return "🐾"
        case .household: return "🏠"
        case .food: return "🍙"
        case .plant: return "🌿"
        case .tool: return "🔧"
        case .oddity: return "❓"
        }
    }
}

// MARK: - 稀有度

enum Rarity: Int, Codable, CaseIterable, Identifiable, Comparable {
    case common = 0
    case uncommon
    case rare
    case epic
    case legendary

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .common: return "常見"
        case .uncommon: return "少見"
        case .rare: return "稀有"
        case .epic: return "史詩"
        case .legendary: return "傳說"
        }
    }

    /// 主色（hex）
    var tintHex: UInt32 {
        switch self {
        case .common: return 0x8C93A8
        case .uncommon: return 0x5CC46B
        case .rare: return 0x4A90D9
        case .epic: return 0xB25CE0
        case .legendary: return 0xF0A020
        }
    }

    /// 基礎權重（整數，愈大愈易中）
    var baseWeight: Int {
        switch self {
        case .common: return 58
        case .uncommon: return 26
        case .rare: return 11
        case .epic: return 4
        case .legendary: return 1
        }
    }

    static func < (lhs: Rarity, rhs: Rarity) -> Bool { lhs.rawValue < rhs.rawValue }
}

// MARK: - 發現來源（邊個 sensor 事件）

enum DiscoverySource: String, Codable, CaseIterable {
    case stepMilestone      // 行夠一定步數
    case walkingBout        // 行完一輪，靜落嚟
    case impact             // 大衝擊
    case shake              // 搖晃手機
    case stillness          // 長時間靜止
    case dailyGift          // 每日第一次開 app
    case debug              // 測試用

    var label: String {
        switch self {
        case .stepMilestone: return "行路"
        case .walkingBout: return "行完一段"
        case .impact: return "一下衝擊"
        case .shake: return "搖晃"
        case .stillness: return "靜止"
        case .dailyGift: return "今日第一次"
        case .debug: return "測試"
        }
    }

    /// 稀有度加成：呢種事件特別容易出好嘢
    var luckBonus: Int {
        switch self {
        case .stepMilestone: return 0
        case .walkingBout: return 1
        case .impact: return 3
        case .shake: return 2
        case .stillness: return 1
        case .dailyGift: return 2
        case .debug: return 0
        }
    }
}

// MARK: - Sensor 訊號

enum ActivityKind: String {
    case unknown
    case stationary
    case walking
    case running
    case cycling
    case automotive

    var label: String {
        switch self {
        case .unknown: return "未知"
        case .stationary: return "靜止"
        case .walking: return "行緊"
        case .running: return "跑緊"
        case .cycling: return "踩單車"
        case .automotive: return "坐車"
        }
    }

    var isMoving: Bool {
        switch self {
        case .walking, .running, .cycling: return true
        default: return false
        }
    }
}

enum SensorSignal {
    case steps(total: Int, delta: Int)
    case activity(ActivityKind)
    case impact(peak: Double)
    case shake(count: Int)
}

// MARK: - 物件

/// AI 生成嘅外觀提示（name/note 以外）。全部 optional：AI 失敗就跟程序化生成。
struct AIHints: Codable, Equatable {
    var archetype: String?
    var ear: Int?
    var pattern: Int?
    var paletteHex: UInt32?
}

struct DiscoveredItem: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var discoverySeed: UInt64
    var category: ItemCategory
    var rarity: Rarity
    var baseName: String
    var aiName: String?
    var aiNote: String?
    var hints: AIHints?
    var exp: Int = 0
    var discoveredAt: Date = Date()
    var source: DiscoverySource
    var sourceNote: String = ""

    var stage: Int { Growth.stage(forExp: exp) }

    var displayName: String {
        if let aiName, !aiName.isEmpty { return aiName }
        return baseName
    }

    var note: String {
        if let aiNote, !aiNote.isEmpty { return aiNote }
        return "\(source.label)嘅時候出現。"
    }
}

// MARK: - 成長

enum Growth {
    static let stageNames = ["幼體", "成形", "成熟", "異變"]
    static let thresholds = [0, 250, 900, 2600]

    static var maxStage: Int { stageNames.count - 1 }

    static func stage(forExp exp: Int) -> Int {
        var s = 0
        for (i, t) in thresholds.enumerated() where exp >= t { s = i }
        return s
    }

    static func nextThreshold(exp: Int) -> Int? {
        for t in thresholds where t > exp { return t }
        return nil
    }

    static func progress(exp: Int) -> Double {
        let stage = stage(forExp: exp)
        guard stage < maxStage else { return 1 }
        let low = Double(thresholds[stage])
        let high = Double(thresholds[stage + 1])
        guard high > low else { return 1 }
        return min(1, max(0, (Double(exp) - low) / (high - low)))
    }
}
