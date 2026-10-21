import Foundation

/// SplitMix64 — 決定性隨機數，同一個 seed 永遠出同一件物件。
struct SeededRandom {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 0x9E37_79B9_7F4A_7C15 : seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// 0 ..< upper
    mutating func int(_ upper: Int) -> Int {
        guard upper > 0 else { return 0 }
        return Int(next() % UInt64(upper))
    }

    /// lower ... upper（含頭尾）
    mutating func int(_ lower: Int, _ upper: Int) -> Int {
        guard upper > lower else { return lower }
        return lower + int(upper - lower + 1)
    }

    mutating func double() -> Double {
        Double(next() % 1_000_000) / 1_000_000.0
    }

    mutating func chance(_ p: Double) -> Bool {
        double() < p
    }

    mutating func pick<T>(_ array: [T], fallback: T) -> T {
        guard !array.isEmpty else { return fallback }
        return array[int(array.count)]
    }

    mutating func sign() -> Int {
        chance(0.5) ? 1 : -1
    }
}

enum SeedFactory {
    static func newSeed() -> UInt64 {
        var rng = SeededRandom(seed: UInt64(Date().timeIntervalSince1970 * 1000))
        let a = rng.next()
        let b = UInt64.random(in: 1...UInt64(UInt32.max))
        return (a ^ (b << 17)) | 1
    }
}
