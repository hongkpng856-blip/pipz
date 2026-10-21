import SwiftUI

struct DebugView: View {
    @EnvironmentObject private var store: GameStore
    @Environment(\.dismiss) private var dismiss
    @State private var gallerySeed: UInt64 = SeedFactory.newSeed()

    var body: some View {
        NavigationView {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    liveReadout
                    simulateSection
                    gallerySection
                }
                .padding(16)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("測試面板")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("關") { dismiss() }
                        .foregroundColor(Theme.accent)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var liveReadout: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "即時讀數")
            HStack(spacing: 8) {
                StatChip(title: "步數", value: "\(store.motion.steps)")
                StatChip(title: "活動", value: store.motion.activity.label, tint: Theme.text)
                StatChip(title: "峰值", value: String(format: "%.2fg", store.motion.peakAcceleration))
            }
            HStack(spacing: 8) {
                StatChip(title: "取樣率", value: String(format: "%.0f Hz", store.motion.sampleRate))
                StatChip(title: "今日發現", value: "\(store.dailyCount)", tint: Theme.accent2)
                StatChip(title: "收藏", value: "\(store.items.count)")
            }
            Text(store.motion.statusSummary)
                .font(.pixelLight(9))
                .foregroundColor(Theme.dim)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .pixelPanel(color: Theme.panelRaised, radius: 3)
    }

    private var simulateSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "模擬事件（無視冷卻 / 上限）")
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(DiscoverySource.allCases, id: \.rawValue) { source in
                    PixelButton(title: source.label, tint: Theme.accent) {
                        store.discover(source: source, intensity: 1.6, bypassLimits: true)
                    }
                }
            }
            Text("如果彈出「發現」卡，即係流程正常。")
                .font(.pixelLight(9))
                .foregroundColor(Theme.dim)
        }
    }

    private var gallerySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "生成器預覽（同一個 seed 永遠一樣）")
            Button {
                gallerySeed = SeedFactory.newSeed()
            } label: {
                Text("換一批")
                    .font(.pixel(11))
                    .foregroundColor(Theme.accent)
            }
            .buttonStyle(.plain)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(0..<16, id: \.self) { index in
                    let seed = gallerySeed &+ UInt64(index) &* 7919
                    let category = ItemCategory.allCases[index % ItemCategory.allCases.count]
                    let stage = (index / 6) % (Growth.maxStage + 1)
                    let rarity = Rarity.allCases[(index / 2) % Rarity.allCases.count]
                    VStack(spacing: 4) {
                        SeededSpriteView(seed: seed, category: category, rarity: rarity, stage: stage, size: 58)
                        Text("\(category.label)·\(Growth.stageNames[stage])")
                            .font(.pixel(7))
                            .foregroundColor(Theme.dim)
                    }
                    .padding(.vertical, 6)
                    .pixelPanel(color: Theme.panel, radius: 3)
                }
            }
        }
    }
}
