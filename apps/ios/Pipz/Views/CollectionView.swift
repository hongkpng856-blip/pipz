import SwiftUI

struct CollectionView: View {
    @EnvironmentObject private var store: GameStore
    @State private var selected: DiscoveredItem?

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        VStack(spacing: 0) {
            header
            if store.items.isEmpty {
                Spacer()
                VStack(spacing: 10) {
                    PixelGlyphView(glyph: .book, color: Theme.line, size: 80)
                    Text("圖鑑仲係空白")
                        .font(.pixel(15))
                        .foregroundColor(Theme.text)
                    Text("出去行下，就會有嘢入嚟。")
                        .font(.pixelLight(11))
                        .foregroundColor(Theme.dim)
                }
                Spacer()
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVGrid(columns: columns, spacing: 10) {
                        ForEach(store.items) { item in
                            Button {
                                selected = item
                            } label: {
                                cell(item)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .padding(.bottom, 90)
                }
            }
        }
        .sheet(item: $selected) { item in
            ItemDetailView(itemID: item.id)
                .environmentObject(store)
        }
    }

    private var header: some View {
        HStack {
            Text("圖鑑")
                .font(.pixel(20))
                .foregroundColor(Theme.text)
            Spacer()
            Text("\(store.items.count) 件")
                .font(.pixel(12))
                .foregroundColor(Theme.accent)
        }
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 8)
    }

    private func cell(_ item: DiscoveredItem) -> some View {
        VStack(spacing: 5) {
            ItemSpriteView(item: item, size: 68)
            Text(item.displayName)
                .font(.pixelLight(9))
                .foregroundColor(Theme.text)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(height: 24)
            HStack(spacing: 3) {
                Circle()
                    .fill(Color(hex: item.rarity.tintHex))
                    .frame(width: 5, height: 5)
                Text(Growth.stageNames[item.stage])
                    .font(.pixel(8))
                    .foregroundColor(Theme.dim)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .padding(.horizontal, 4)
        .pixelPanel(color: Theme.panel, border: Color(hex: item.rarity.tintHex).opacity(0.55), radius: 3)
    }
}
