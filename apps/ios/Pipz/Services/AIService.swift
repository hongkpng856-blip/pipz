import Foundation

// MARK: - 設定（開箱即用：唔需要玩家填 key）

struct AIConfig {
    /// 我哋自己嘅 proxy（key 只喺 server 環境變數，唔會喺 app 入面）
    static let defaultEndpoint = "https://pipz.anthroskill.com/api/mini/spawn"

    static var isEnabled: Bool {
        (UserDefaults.standard.object(forKey: "ai.enabled") as? Bool) ?? true
    }

    static var endpoint: String {
        let value = UserDefaults.standard.string(forKey: "ai.endpoint") ?? ""
        return value.isEmpty ? defaultEndpoint : value
    }

    static var usingDefaultEndpoint: Bool {
        endpoint == defaultEndpoint
    }
}

// MARK: - AI 生成（伺服器端代打，失敗就跟離線生成）

final class AIService {
    static let shared = AIService()
    private init() {}

    struct Spawn {
        let name: String
        let note: String
        let hints: AIHints
    }

    func spawn(category: ItemCategory, rarity: Rarity, source: DiscoverySource, seed: UInt64,
               completion: @escaping (Spawn?) -> Void) {
        guard AIConfig.isEnabled, let url = URL(string: AIConfig.endpoint) else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 26
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Pipz-iOS/1.0", forHTTPHeaderField: "User-Agent")

        let body: [String: Any] = [
            "category": category.label,
            "categoryKey": category.rawValue,
            "rarity": rarity.label,
            "source": source.label,
            "seed": String(seed)
        ]
        guard let payload = try? JSONSerialization.data(withJSONObject: body) else {
            completion(nil)
            return
        }
        request.httpBody = payload

        URLSession.shared.dataTask(with: request) { data, _, _ in
            let parsed = data.flatMap { AIService.parse($0) }
            DispatchQueue.main.async { completion(parsed) }
        }.resume()
    }

    private static func parse(_ data: Data) -> Spawn? {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let name = object["name"] as? String,
            !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else { return nil }

        var hints = AIHints()
        if let archetype = object["archetype"] as? String, !archetype.isEmpty {
            hints.archetype = archetype.lowercased()
        }
        if let ear = object["ear"] as? Int {
            hints.ear = min(3, max(0, ear))
        }
        if let pattern = object["pattern"] as? Int {
            hints.pattern = pattern == 0 ? 0 : 1
        }
        if let palette = object["palette"] as? String {
            hints.paletteHex = Self.hex(from: palette)
        }

        let note = (object["note"] as? String) ?? ""
        return Spawn(name: name, note: note, hints: hints)
    }

    static func hex(from string: String) -> UInt32? {
        let cleaned = string.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        guard cleaned.count == 6, let value = UInt32(cleaned, radix: 16) else { return nil }
        return value
    }
}
