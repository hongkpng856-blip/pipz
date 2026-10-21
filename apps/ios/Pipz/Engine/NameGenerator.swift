import Foundation

/// 離線名／描述生成。唔需要網、即時有結果；如果之後有 LLM key，可以再改名。
enum NameGenerator {

    private struct Pool {
        let prefixes: [String]
        let bases: [String]
        let suffixes: [String]
        let notes: [String]
    }

    private static func pool(for category: ItemCategory) -> Pool {
        switch category {
        case .animal:
            return Pool(
                prefixes: ["灰斑", "圓滾", "短尾", "三眼", "霧白", "夜行", "單耳", "鏽色", "掌心大", "過度禮貌", "沒有腳", "半透明", "打噴嚏", "兩隻左腳", "慢半拍"],
                bases: ["絨獸", "沙蝠", "潮蟲", "紙鷸", "牆角蜥", "拖線鼬", "麵包熊", "電線貓", "拖鞋兔", "縫隙蝦", "影印鼠", "午睡貂"],
                suffixes: ["", "", "", "", "・幼", "・啞", "・浮雕", "・深夜型", "・見習"],
                notes: ["唔知由邊度嚟，望住你唔走。", "行得好慢，但一直跟住你。", "佢好似識你，但你唔記得見過。", "細細隻，會自己搵個位坐低。"]
            )
        case .household:
            return Pool(
                prefixes: ["午後的", "別人的", "二手", "沒用途的", "微微發熱", "過期包裝", "祖母的", "樓下的", "會發聲", "無人認領", "縮水了的", "凌晨出現"],
                bases: ["陶瓷小碟", "鐵盒", "水壺", "膠袋", "掃把頭", "杯墊", "門牌", "拖板", "燈罩", "相框", "膠櫈", "毛巾邊"],
                suffixes: ["", "", "", "・殘", "・複製品", "・迷你"],
                notes: ["好似一直喺你屋企，只係你今日先見到。", "你冇印象買過，但係好襯你間房。", "摸落去係室溫，但感覺係暖。", "角落頭多咗件嘢，冇人認頭。"]
            )
        case .food:
            return Pool(
                prefixes: ["隔夜的", "燒焦的", "忘記名字的", "巷口的", "半溶的", "別人請的", "剛好夠熱", "掉在地上的"],
                bases: ["飯糰", "蛋撻", "糖水", "麵包邊", "魚蛋", "餅碎", "奶茶冰", "涼茶", "腸粉捲", "菠蘿皮"],
                suffixes: ["", "", "", "・一口"],
                notes: ["仲有少少溫度。", "你確定你冇買過。", "唔記得幾時放低，但冇壞。", "食唔食好？先收埋。"]
            )
        case .plant:
            return Pool(
                prefixes: ["窗台的", "無人澆水", "從縫長出", "會發抖", "黏住的", "鄰居送的"],
                bases: ["蕨", "仙人掌", "紫羅蘭", "苔球", "野草", "小菇", "藤尖", "豆瓣苗"],
                suffixes: ["", "", "", "・標本"],
                notes: ["從一個唔應該有土嘅地方長出嚟。", "冇人照顧，但越生越好。", "你搬佢去光位，佢就轉頭。", "細細棵，好堅持。"]
            )
        case .tool:
            return Pool(
                prefixes: ["生鏽的", "借來的", "沒電的", "只用過一次", "找不到的", "備用的"],
                bases: ["螺絲批", "膠紙座", "剪刀", "耳機線", "萬字夾", "鎖匙", "拉尺", "鉗仔"],
                suffixes: ["", "", "", "・兩件"],
                notes: ["你搵咗好耐嘅嘢，原來喺度。", "手感好熟，但唔記得用途。", "應該配一對，但得一件。", "冇壞，只係冇用。"]
            )
        case .oddity:
            return Pool(
                prefixes: ["無法命名的", "不應存在的", "昨晚留下的", "第 4 件", "會記住你的", "微微暖的", "多出一個的", "沒有影的"],
                bases: ["輪廓", "殘影", "小孔", "絨塊", "溫熱物", "低鳴體", "正確答案", "空白位"],
                suffixes: ["", "", "", "・無編號"],
                notes: ["你望住佢嗰陣，佢好似都望住你。", "記錄唔到，但你肯定見過。", "數量一直係咁，唔會變成零。", "唔知係咩，但唔覺得驚。"]
            )
        }
    }

    static func make(category: ItemCategory, rarity: Rarity, seed: UInt64, avoid: Set<String>) -> String {
        var rng = SeededRandom(seed: seed ^ 0xA5A5_1234)
        let p = pool(for: category)
        var candidate = ""

        var attempt = 0
        while attempt < 8 {
            let prefix = p.prefixes[rng.int(p.prefixes.count)]
            let base = p.bases[rng.int(p.bases.count)]
            var suffix = p.suffixes[rng.int(p.suffixes.count)]
            if rarity >= .legendary && attempt == 0 {
                suffix = "・唯一"
            }
            candidate = prefix + base + suffix
            if !avoid.contains(candidate) { return candidate }
            attempt += 1
        }

        // 仍然重複 → 加編號
        let serial = rng.int(10, 99)
        return candidate + "（No.\(serial)）"
    }

    static func note(category: ItemCategory, source: DiscoverySource, seed: UInt64) -> String {
        var rng = SeededRandom(seed: seed ^ 0x5A5A_9876)
        let p = pool(for: category)
        let base = p.notes[rng.int(p.notes.count)]
        return "\(source.label)嘅時候出現。\(base)"
    }
}
