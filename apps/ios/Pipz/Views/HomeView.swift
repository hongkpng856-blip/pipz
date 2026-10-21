import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: GameStore
    @State private var bob = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 14) {
                header
                companionCard
                statsRow
                MotionPanel(motion: store.motion)
                StepProgressBar(motion: store.motion)
                footerNote
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 96)
        }
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Pipz")
                    .font(.pixel(26))
                    .foregroundColor(Theme.text)
                Text("平凡嘅一日，隨時會有嘢跳出嚟")
                    .font(.pixelLight(11))
                    .foregroundColor(Theme.dim)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(store.dailyCount.description + " / 24")
                    .font(.pixel(13))
                    .foregroundColor(Theme.accent)
                Text("今日發現")
                    .font(.pixel(9))
                    .foregroundColor(Theme.dim)
            }
        }
    }

    private var companionCard: some View {
        VStack(spacing: 10) {
            if let companion = store.companion {
                ItemSpriteView(item: companion, size: 150)
                    .offset(y: bob ? -5 : 5)
                    .animation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true), value: bob)
                    .onAppear { bob = true }

                HStack(spacing: 8) {
                    Text(companion.displayName)
                        .font(.pixel(17))
                        .foregroundColor(Theme.text)
                    RarityTag(rarity: companion.rarity)
                }

                Text("\(companion.category.label) ・ \(Growth.stageNames[companion.stage])")
                    .font(.pixelLight(11))
                    .foregroundColor(Theme.dim)

                expBar(for: companion)
            } else {
                PixelGlyphView(glyph: .home, color: Theme.line, size: 90)
                    .padding(.vertical, 26)
                Text("仲未有夥伴")
                    .font(.pixel(16))
                    .foregroundColor(Theme.text)
                Text("行 600 步，就會有第一件嘢出現。")
                    .font(.pixelLight(11))
                    .foregroundColor(Theme.dim)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .padding(.horizontal, 14)
        .pixelPanel()
    }

    private func expBar(for item: DiscoveredItem) -> some View {
        VStack(spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Theme.line).frame(height: 8)
                    Rectangle()
                        .fill(Color(hex: item.rarity.tintHex))
                        .frame(width: max(2, geo.size.width * Growth.progress(exp: item.exp)), height: 8)
                }
            }
            .frame(height: 8)

            HStack {
                Text("EXP \(item.exp)")
                    .font(.pixel(9))
                    .foregroundColor(Theme.dim)
                Spacer()
                if let next = Growth.nextThreshold(exp: item.exp) {
                    Text("進化：\(next)")
                        .font(.pixel(9))
                        .foregroundColor(Theme.dim)
                } else {
                    Text("已到最後階段")
                        .font(.pixel(9))
                        .foregroundColor(Theme.accent2)
                }
            }
        }
        .padding(.top, 4)
    }

    private var statsRow: some View {
        HStack(spacing: 8) {
            StatChip(title: "收藏", value: "\(store.items.count)")
            StatChip(title: "今日發現", value: "\(store.dailyCount)", tint: Theme.accent2)
            StatChip(title: "狀態", value: store.motion.activity.label, tint: Theme.text)
        }
    }

    private var footerNote: some View {
        Text("感應器只喺 app 開住嘅時候運作。資料全部留喺你部手機，唔會上傳。")
            .font(.pixelLight(10))
            .foregroundColor(Theme.dim)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)
    }
}

// MARK: - 感應器面板

struct MotionPanel: View {
    @ObservedObject var motion: MotionService
    @EnvironmentObject private var store: GameStore

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "感應器")
            HStack(spacing: 8) {
                StatChip(title: "活動", value: motion.activity.label, tint: Theme.text)
                StatChip(title: "取樣", value: String(format: "%.0f Hz", motion.sampleRate))
                StatChip(title: "衝擊峰值", value: String(format: "%.1fg", motion.peakAcceleration))
            }
            Text(motion.statusSummary)
                .font(.pixelLight(9))
                .foregroundColor(Theme.dim)
                .fixedSize(horizontal: false, vertical: true)
            if !store.statusLine.isEmpty {
                Text(store.statusLine)
                    .font(.pixelLight(10))
                    .foregroundColor(Theme.accent2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .pixelPanel(color: Theme.panelRaised, radius: 3)
    }
}

struct StepProgressBar: View {
    @ObservedObject var motion: MotionService
    private let interval = 600

    var body: some View {
        let remainder = motion.steps % interval
        let remaining = interval - remainder
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("今日步數")
                    .font(.pixel(11))
                    .foregroundColor(Theme.dim)
                Spacer()
                Text("\(motion.steps)")
                    .font(.pixel(13))
                    .foregroundColor(Theme.accent)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Theme.line).frame(height: 10)
                    Rectangle()
                        .fill(Theme.accent)
                        .frame(width: max(2, geo.size.width * Double(remainder) / Double(interval)), height: 10)
                }
            }
            .frame(height: 10)
            Text("再行 \(remaining) 步就有下一次驚喜")
                .font(.pixelLight(10))
                .foregroundColor(Theme.dim)
        }
        .padding(12)
        .pixelPanel(color: Theme.panelRaised, radius: 3)
    }
}
