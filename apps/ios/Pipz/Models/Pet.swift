import Foundation

// MARK: - Data Models

struct User: Identifiable, Codable {
    let id: String
    var email: String
    var username: String = ""
    var totalSteps: Int = 0
    var todaySteps: Int = 0
    var createdAt: Date = Date()
}

struct Pet: Identifiable, Codable, Equatable {
    var id: String
    var userId: String
    var name: String
    var speciesId: String
    var rarity: Rarity
    var level: Int
    var xp: Int
    var totalSteps: Int
    var evolutionStage: Int
    var status: PetStatus
    var stats: PetStats
    var mood: Mood
    var moodValue: Int
    var lastFedAt: Date
    var lastInteractionAt: Date
    var createdAt: Date
    var isForSale: Bool
    var price: Int
    
    static func == (lhs: Pet, rhs: Pet) -> Bool { lhs.id == rhs.id }
}

enum Rarity: String, Codable, CaseIterable {
    case common, uncommon, rare, epic, legendary
}

enum Mood: String, Codable {
    case happy, hungry, sleepy, sad, excited
}

enum PetStatus: String, Codable {
    case baby, juvenile, adult, evolved, legendary
}

struct PetStats: Codable {
    var speed: Int
    var luck: Int
    var charm: Int
    var energy: Int
}

// MARK: - Display Helpers

let RARITY_COLORS: [Rarity: String] = [
    .common: "#9ca3af", .uncommon: "#22c55e", .rare: "#3b82f6",
    .epic: "#8b5cf6", .legendary: "#f59e0b"
]

let RARITY_LABELS: [Rarity: String] = [
    .common: "普通", .uncommon: "稀有", .rare: "珍貴",
    .epic: "史詩", .legendary: "傳說"
]

let MOOD_EMOJI: [Mood: String] = [
    .happy: "😊", .excited: "🤩", .hungry: "😋", .sleepy: "😴", .sad: "😢"
]

let STAGE_LABELS = ["BB", "幼年", "成年", "完全體", "傳說"]
