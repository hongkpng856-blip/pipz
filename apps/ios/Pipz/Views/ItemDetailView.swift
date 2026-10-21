import SwiftUI

struct ItemDetailView: View {
    let itemID: UUID
    @EnvironmentObject private var store: GameStore
    @Environment(\.dismiss) private var dismiss

    private var item: DiscoveredItem? { store.item(id: itemID) }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            if let item {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: item.rarity.tintHex).opacity(0.12))
                                .frame(width: 190, height: 190)
                            ItemSpriteView(item: item, size: 165)
                        }
                        .frame(height: 200)

                        Text(item.displayName)
                            .font(.pixel(21))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)

                        HStack(spacing: 8) {
                            RarityTag(rarity: item.rarity)
                            Text(item.category.label)
                                .font(.pixel(11))
                                .foregroundColor(Theme.dim)
                            Text(Growth.stageNames[item.stage])
                                .font(.pixel(11))
                                .foregroundColor(Theme.accent2)
                        }

                        VStack(spacing: 5) {
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
                                    .font(.pixel(10))
                                    .foregroundColor(Theme.dim)
                                Spacer()
                                if let next = Growth.nextThreshold(exp: item.exp) {
                                    Text("再 \(next - item.exp) 點進化")
                                        .font(.pixel(10))
                                        .foregroundColor(Theme.dim)
                                } else {
                                    Text("最終形態")
                                        .font(.pixel(10))
                                        .foregroundColor(Theme.accent2)
                                }
                            }
                        }
                        .padding(.horizontal, 6)

                        Text(item.note)
                            .font(.pixelLight(13))
                            .foregroundColor(Theme.dim)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.horizontal, 10)

                        VStack(spacing: 6) {
                            metaRow("來自", item.source.label)
                            metaRow("發現時間", ItemDetailView.dateFormatter.string(from: item.discoveredAt))
                            if let aiName = item.aiName, !aiName.isEmpty {
                                metaRow("原始名", item.baseName)
                            }
                        }
                        .padding(12)
                        .pixelPanel(color: Theme.panelRaised, radius: 3)

                        if store.companionID == item.id {
                            Text("佢而家係你嘅夥伴，會陪你行路長大。")
                                .font(.pixelLight(11))
                                .foregroundColor(Theme.accent)
                                .padding(.top, 4)
                        } else {
                            PixelButton(title: "設為夥伴", filled: true) {
                                store.setCompanion(item.id)
                            }
                        }

                        PixelButton(title: "關閉", tint: Theme.dim) {
                            dismiss()
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 18)
                    .padding(.bottom, 28)
                }
            } else {
                Text("搵唔到呢件嘢")
                    .font(.pixel(14))
                    .foregroundColor(Theme.dim)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func metaRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(.pixel(10))
                .foregroundColor(Theme.dim)
            Spacer()
            Text(value)
                .font(.pixelLight(11))
                .foregroundColor(Theme.text)
        }
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "M月d日 HH:mm"
        f.locale = Locale(identifier: "zh_HK")
        return f
    }()
}
