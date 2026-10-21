import SwiftUI

enum Theme {
    static let bg = Color(hex: 0x0B1020)
    static let panel = Color(hex: 0x141B2E)
    static let panelRaised = Color(hex: 0x1C2438)
    static let line = Color(hex: 0x2A3550)
    static let text = Color(hex: 0xE9EDF6)
    static let dim = Color(hex: 0x8C93A8)
    static let accent = Color(hex: 0x5CE0C0)
    static let accent2 = Color(hex: 0xFFB347)
    static let danger = Color(hex: 0xE0576B)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}

extension Font {
    static func pixel(_ size: CGFloat) -> Font {
        .system(size: size, weight: .bold, design: .monospaced)
    }

    static func pixelLight(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .monospaced)
    }
}

// MARK: - 像素風外框

struct PixelPanel: ViewModifier {
    var color: Color = Theme.panel
    var border: Color = Theme.line
    var radius: CGFloat = 4

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(color)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(border, lineWidth: 2)
            )
    }
}

extension View {
    func pixelPanel(color: Color = Theme.panel, border: Color = Theme.line, radius: CGFloat = 4) -> some View {
        modifier(PixelPanel(color: color, border: border, radius: radius))
    }
}

// MARK: - 像素 glyph（nav 用）

enum PixelGlyph: String, CaseIterable, Identifiable {
    case home
    case book
    case gear

    var id: String { rawValue }

    var label: String {
        switch self {
        case .home: return "主頁"
        case .book: return "圖鑑"
        case .gear: return "設定"
        }
    }

    /// 7x7，# = 實心
    var rows: [String] {
        switch self {
        case .home:
            return [
                "...#...",
                "..###..",
                ".#####.",
                "#######",
                ".#####.",
                ".#.#.#.",
                ".#.#.#."
            ]
        case .book:
            return [
                "##.###.",
                "#..####",
                "#..#..#",
                "#..####",
                "#..#..#",
                "#..####",
                "##.###."
            ]
        case .gear:
            return [
                "..#.#..",
                "#######",
                ".##.##.",
                "#..#..#",
                ".##.##.",
                "#######",
                "..#.#.."
            ]
        }
    }
}

struct PixelGlyphView: View {
    let glyph: PixelGlyph
    var color: Color = Theme.text
    var size: CGFloat = 22

    var body: some View {
        Canvas { context, canvasSize in
            let rows = glyph.rows
            let count = max(1, rows.count)
            let cell = min(canvasSize.width, canvasSize.height) / CGFloat(count)
            for (y, row) in rows.enumerated() {
                for (x, char) in row.enumerated() where char == "#" {
                    let rect = CGRect(
                        x: CGFloat(x) * cell,
                        y: CGFloat(y) * cell,
                        width: cell + 0.4,
                        height: cell + 0.4
                    )
                    context.fill(Path(rect), with: .color(color))
                }
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - 小元件

struct StatChip: View {
    let title: String
    let value: String
    var tint: Color = Theme.accent

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.pixel(10))
                .foregroundColor(Theme.dim)
            Text(value)
                .font(.pixel(15))
                .foregroundColor(tint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .pixelPanel(color: Theme.panelRaised, radius: 3)
    }
}

struct RarityTag: View {
    let rarity: Rarity

    var body: some View {
        Text(rarity.label)
            .font(.pixel(10))
            .foregroundColor(Color(hex: rarity.tintHex))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .stroke(Color(hex: rarity.tintHex).opacity(0.8), lineWidth: 1.5)
            )
    }
}

struct PixelButton: View {
    let title: String
    var tint: Color = Theme.accent
    var filled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.pixel(14))
                .foregroundColor(filled ? Theme.bg : tint)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: 3)
                        .fill(filled ? tint : Color.clear)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 3)
                        .stroke(tint, lineWidth: 2)
                )
        }
        .buttonStyle(.plain)
    }
}

struct SectionHeader: View {
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Rectangle()
                .fill(Theme.accent)
                .frame(width: 4, height: 12)
            Text(text)
                .font(.pixel(12))
                .foregroundColor(Theme.dim)
            Spacer(minLength: 0)
        }
    }
}
