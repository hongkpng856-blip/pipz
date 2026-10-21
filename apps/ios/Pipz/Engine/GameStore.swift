import Foundation
import Combine

// MARK: - 規則

struct DiscoveryRules {
    /// 每行幾多步會觸發一次「行路」發現
    var stepInterval = 600
    /// 每日最多幾次發現（防止刷）
    var maxPerDay = 24
    /// 兩次發現之間最少隔幾秒
    var minGap: TimeInterval = 70
    /// 連續行夠幾多步，然後停低 → 「行完一段」
    var walkingBoutSteps = 250
    /// 靜止幾耐 → 「靜止」發現
    var stillnessSeconds: TimeInterval = 12 * 60
    /// 幾多步換 1 點經驗
    var stepsPerExp = 60
    /// 衝擊門檻（g）
    var impactThreshold = 2.1

    static let standard = DiscoveryRules()
}

// MARK: - 存檔

struct SaveState: Codable {
    var items: [DiscoveredItem] = []
    var companionID: UUID?
    var totalSteps: Int = 0
    var lastDiscovery: Date?
    var dailyKey: String = ""
    var dailyCount: Int = 0
    var stepAccumulator: Int = 0
    var stepExpAccumulator: Int = 0
}

// MARK: - 遊戲狀態

@MainActor
final class GameStore: ObservableObject {

    @Published private(set) var items: [DiscoveredItem] = []
    @Published private(set) var totalSteps: Int = 0
    @Published private(set) var dailyCount: Int = 0
    @Published var companionID: UUID?
    @Published var reveal: DiscoveredItem?
    @Published var statusLine: String = ""

    let motion = MotionService()
    private let rules = DiscoveryRules.standard

    private var state = SaveState()
    private var ticker: Timer?
    private var walkingSteps = 0
    private var stationarySeconds: TimeInterval = 0
    private var lastActivity: ActivityKind = .unknown
    private var pendingDailyGift = false
    private var isForeground = true

    init() {
        load()
        motion.onSignal = { [weak self] signal in
            Task { @MainActor in self?.handle(signal) }
        }
    }

    // MARK: 生命週期

    func bootstrap() {
        refreshDaily()
        motion.start()
        startTicker()
        if pendingDailyGift {
            pendingDailyGift = false
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                self.discover(source: .dailyGift, intensity: 1.0)
            }
        }
    }

    func scenePhaseChanged(active: Bool) {
        isForeground = active
        if active {
            refreshDaily()
            motion.start()
            startTicker()
        } else {
            motion.stop()
            ticker?.invalidate()
            ticker = nil
            save()
        }
    }

    private func startTicker() {
        guard ticker == nil else { return }
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        RunLoop.main.add(timer, forMode: .common)
        ticker = timer
    }

    private func tick() {
        guard reveal == nil else { return }
        let kind = motion.activity
        if kind.isMoving {
            stationarySeconds = 0
        } else {
            stationarySeconds += 1
        }
        if enabled("sensor.stillness"), stationarySeconds >= rules.stillnessSeconds, isForeground {
            stationarySeconds = 0
            discover(source: .stillness, intensity: 1.0)
        }
    }

    // MARK: 訊號處理

    private func handle(_ signal: SensorSignal) {
        switch signal {
        case let .steps(total, delta):
            totalSteps = total
            state.totalSteps = total
            handleSteps(delta: delta)

        case let .activity(kind):
            let previous = lastActivity
            lastActivity = kind
            motion.activity = kind
            if previous.isMoving && !kind.isMoving && walkingSteps >= rules.walkingBoutSteps {
                walkingSteps = 0
                discover(source: .walkingBout, intensity: 1.4)
            }
            if !kind.isMoving {
                walkingSteps = 0
            }

        case let .impact(peak):
            guard enabled("sensor.impact"), peak >= rules.impactThreshold else { return }
            let intensity = min(3.0, peak / 2.0)
            discover(source: .impact, intensity: intensity)

        case let .shake(count):
            guard enabled("sensor.shake"), count >= 3 else { return }
            discover(source: .shake, intensity: 1.2)
        }
    }

    private func handleSteps(delta: Int) {
        guard delta > 0 else { return }
        if enabled("sensor.bout"), motion.activity.isMoving {
            walkingSteps += delta
        }

        // 夥伴經驗
        state.stepExpAccumulator += delta
        while state.stepExpAccumulator >= rules.stepsPerExp {
            state.stepExpAccumulator -= rules.stepsPerExp
            if let id = companionID {
                addExp(1, to: id)
            }
        }

        guard enabled("sensor.steps") else {
            save()
            return
        }
        state.stepAccumulator += delta
        if state.stepAccumulator >= rules.stepInterval {
            state.stepAccumulator = 0
            discover(source: .stepMilestone, intensity: 1.0)
        }
        save()
    }

    // MARK: 發現

    func discover(source: DiscoverySource, intensity: Double, bypassLimits: Bool = false) {
        guard reveal == nil else { return }
        refreshDaily()
        if !bypassLimits {
            guard dailyCount < rules.maxPerDay else {
                statusLine = "今日夠數啦，聽日再行"
                return
            }
            if let last = state.lastDiscovery, Date().timeIntervalSince(last) < rules.minGap {
                return
            }
        }

        let seed = SeedFactory.newSeed()
        var rng = SeededRandom(seed: seed)
        let rarity = rollRarity(&rng, source: source, intensity: intensity)
        let category = rollCategory(&rng, source: source)
        let existingNames = Set(items.map { $0.baseName })
        let name = NameGenerator.make(category: category, rarity: rarity, seed: seed, avoid: existingNames)
        let note = NameGenerator.note(category: category, source: source, seed: seed)

        let newItem = DiscoveredItem(
            discoverySeed: seed,
            category: category,
            rarity: rarity,
            baseName: name,
            aiName: nil,
            aiNote: nil,
            exp: (category == .oddity && rarity >= .rare) ? 40 : 20,
            discoveredAt: Date(),
            source: source,
            sourceNote: note
        )

        items.insert(newItem, at: 0)
        state.items = items
        dailyCount += 1
        state.dailyCount = dailyCount
        state.lastDiscovery = Date()
        if companionID == nil {
            companionID = newItem.id
            state.companionID = newItem.id
        }
        save()

        reveal = newItem

        // AI 即時生成（開箱即用：走我哋自己嘅 proxy，玩家唔需要任何 key）
        if AIConfig.isEnabled {
            AIService.shared.spawn(category: category, rarity: rarity, source: source, seed: seed) { [weak self] result in
                guard let result else { return }
                Task { @MainActor in
                    self?.applyAI(result, to: newItem.id)
                }
            }
        }
    }

    private func applyAI(_ result: AIService.Spawn, to id: UUID) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        items[index].aiName = result.name
        if !result.note.isEmpty {
            items[index].aiNote = result.note
        }
        items[index].hints = result.hints
        if reveal?.id == id {
            reveal = items[index]
        }
        state.items = items
        save()
    }

    private func rollRarity(_ rng: inout SeededRandom, source: DiscoverySource, intensity: Double) -> Rarity {
        let luck = Double(source.luckBonus) + max(0, intensity - 1.0)
        var weights: [Double] = []
        for rarity in Rarity.allCases {
            let factor = 1.0 + luck * Double(rarity.rawValue) * 0.18
            weights.append(Double(rarity.baseWeight) * factor)
        }
        let total = weights.reduce(0, +)
        var roll = rng.double() * total
        for (index, weight) in weights.enumerated() {
            roll -= weight
            if roll <= 0 {
                return Rarity(rawValue: index) ?? .common
            }
        }
        return .common
    }

    private func rollCategory(_ rng: inout SeededRandom, source: DiscoverySource) -> ItemCategory {
        let table: [ItemCategory: Int]
        switch source {
        case .stepMilestone:
            table = [.animal: 30, .plant: 20, .tool: 15, .food: 15, .household: 15, .oddity: 5]
        case .walkingBout:
            table = [.animal: 40, .plant: 25, .oddity: 10, .household: 10, .food: 10, .tool: 5]
        case .impact:
            table = [.oddity: 35, .animal: 30, .tool: 20, .household: 10, .food: 5, .plant: 0]
        case .shake:
            table = [.oddity: 40, .animal: 25, .tool: 15, .food: 10, .household: 10, .plant: 0]
        case .stillness:
            table = [.household: 35, .food: 20, .plant: 20, .oddity: 15, .animal: 10, .tool: 0]
        case .dailyGift, .debug:
            table = [.animal: 20, .household: 20, .food: 15, .plant: 15, .tool: 15, .oddity: 15]
        }
        let ordered = ItemCategory.allCases
        let total = ordered.reduce(0) { $0 + (table[$1] ?? 0) }
        guard total > 0 else { return .animal }
        var roll = rng.int(total)
        for category in ordered {
            roll -= (table[category] ?? 0)
            if roll < 0 { return category }
        }
        return .animal
    }

    // MARK: 成長

    var companion: DiscoveredItem? {
        guard let companionID else { return nil }
        return items.first { $0.id == companionID }
    }

    func setCompanion(_ id: UUID) {
        companionID = id
        state.companionID = id
        save()
    }

    func addExp(_ amount: Int, to id: UUID) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        items[index].exp += amount
        state.items = items
    }

    func item(id: UUID) -> DiscoveredItem? {
        items.first { $0.id == id }
    }

    func dismissReveal() {
        reveal = nil
        save()
    }

    // MARK: 設定

    private func enabled(_ key: String) -> Bool {
        (UserDefaults.standard.object(forKey: key) as? Bool) ?? true
    }

    // MARK: 每日

    private func refreshDaily() {
        let key = GameStore.dayKey()
        if state.dailyKey != key {
            state.dailyKey = key
            state.dailyCount = 0
            dailyCount = 0
            pendingDailyGift = true
            save()
        }
    }

    static func dayKey(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: date)
    }

    // MARK: 存讀檔

    private var fileURL: URL {
        let manager = FileManager.default
        let dir = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? manager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        if !manager.fileExists(atPath: dir.path) {
            try? manager.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir.appendingPathComponent("pipz_mini_state.json")
    }

    func load() {
        guard
            let data = try? Data(contentsOf: fileURL),
            let decoded = try? JSONDecoder().decode(SaveState.self, from: data)
        else {
            state = SaveState()
            items = []
            return
        }
        state = decoded
        items = decoded.items
        companionID = decoded.companionID
        totalSteps = decoded.totalSteps
        dailyCount = decoded.dailyCount
    }

    func save() {
        state.items = items
        state.companionID = companionID
        guard let data = try? JSONEncoder().encode(state) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    func resetAll() {
        state = SaveState()
        items = []
        companionID = nil
        reveal = nil
        totalSteps = 0
        dailyCount = 0
        walkingSteps = 0
        stationarySeconds = 0
        motion.resetSteps()
        save()
    }
}
