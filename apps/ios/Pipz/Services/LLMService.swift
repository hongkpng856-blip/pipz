import Foundation

// MARK: - 設定（存在 UserDefaults）

struct LLMConfig {
    var enabled: Bool
    var endpoint: String
    var model: String
    var apiKey: String

    static let defaultEndpoint = "https://api.commandcode.ai/provider/v1/chat/completions"
    static let defaultModel = "deepseek/deepseek-v4-flash"

    static func load() -> LLMConfig {
        let d = UserDefaults.standard
        return LLMConfig(
            enabled: d.bool(forKey: "llm.enabled"),
            endpoint: d.string(forKey: "llm.endpoint").flatMap { $0.isEmpty ? nil : $0 } ?? defaultEndpoint,
            model: d.string(forKey: "llm.model").flatMap { $0.isEmpty ? nil : $0 } ?? defaultModel,
            apiKey: d.string(forKey: "llm.key") ?? ""
        )
    }

    func save() {
        let d = UserDefaults.standard
        d.set(enabled, forKey: "llm.enabled")
        d.set(endpoint, forKey: "llm.endpoint")
        d.set(model, forKey: "llm.model")
        d.set(apiKey, forKey: "llm.key")
    }

    var usable: Bool { enabled && !apiKey.isEmpty && URL(string: endpoint) != nil }
}

// MARK: - AI 改名（可選）

final class LLMService {
    static let shared = LLMService()
    private init() {}

    struct Enrichment {
        let name: String
        let note: String
    }

    /// 失敗就靜靜咁返回 nil，App 完全唔會因為冇網／冇 key 而壞。
    func enrich(category: ItemCategory, rarity: Rarity, baseName: String, source: DiscoverySource,
                completion: @escaping (Enrichment?) -> Void) {
        let config = LLMConfig.load()
        guard config.usable, let url = URL(string: config.endpoint) else {
            completion(nil)
            return
        }

        let system = """
        你係一個幫手機遊戲隨機生成古怪小物件嘅作家。全部用香港繁體中文（廣東話語感，可以帶少少口語）。
        風格：日常、平凡之中有少少驚喜、唔恐怖、唔色情、唔涉及真人同品牌。
        只可以輸出一個 JSON object，唔可以有其他文字，格式：
        {"name":"...","note":"..."}
        name：4 至 10 個字嘅名，要具體、有畫面感。
        note：一句 30 字以內嘅描述。
        """
        let user = """
        物件類型：\(category.label)
        稀有度：\(rarity.label)
        暫時嘅名：\(baseName)
        出現情況：\(source.label)
        """

        let body: [String: Any] = [
            "model": config.model,
            "messages": [
                ["role": "system", "content": system],
                ["role": "user", "content": user]
            ],
            "temperature": 1.0,
            "max_tokens": 200
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: body) else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(config.apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { responseData, _, _ in
            guard let responseData else {
                completion(nil)
                return
            }
            let parsed = LLMService.parse(responseData)
            DispatchQueue.main.async { completion(parsed) }
        }.resume()
    }

    private static func parse(_ data: Data) -> Enrichment? {
        guard
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let choices = root["choices"] as? [[String: Any]],
            let message = choices.first?["message"] as? [String: Any],
            let content = message["content"] as? String
        else { return nil }

        guard let start = content.firstIndex(of: "{"), let end = content.lastIndex(of: "}"), start < end else {
            return nil
        }
        let jsonText = String(content[start...end])
        guard
            let jsonData = jsonText.data(using: .utf8),
            let obj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
            let name = obj["name"] as? String,
            !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else { return nil }

        let note = (obj["note"] as? String) ?? ""
        return Enrichment(name: name, note: note)
    }
}
