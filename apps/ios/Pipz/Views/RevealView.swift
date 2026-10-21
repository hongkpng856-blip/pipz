import SwiftUI

struct RevealView: View {
    let item: DiscoveredItem
    let onClose: () -> Void

    @State private var appeared = false
    @State private var pulse = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.75).ignoresSafeArea()

            VStack(spacing: 14) {
                Text("發現！")
                    .font(.pixel(12))
                    .foregroundColor(Color(hex: item.rarity.tintHex))
                    .tracking(4)

                ZStack {
                    Circle()
                        .fill(Color(hex: item.rarity.tintHex).opacity(pulse ? 0.22 : 0.08))
                        .frame(width: pulse ? 210 : 150, height: pulse ? 210 : 150)
                        .animation(.easeOut(duration: 1.2).repeatForever(autoreverses: true), value: pulse)

                    ItemSpriteView(item: item, size: 150)
                        .scaleEffect(appeared ? 1 : 0.4)
                }
                .frame(height: 200)

                Text(item.displayName)
                    .font(.pixel(20))
                    .foregroundColor(Theme.text)
                    .multilineTextAlignment(.center)

                HStack(spacing: 8) {
                    RarityTag(rarity: item.rarity)
                    Text("\(item.category.label) ・ \(item.source.label)")
                        .font(.pixel(10))
                        .foregroundColor(Theme.dim)
                }

                Text(item.note)
                    .font(.pixelLight(12))
                    .foregroundColor(Theme.dim)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 6)

                PixelButton(title: "收下", tint: Color(hex: item.rarity.tintHex), filled: true) {
                    onClose()
                }
                .padding(.top, 6)
            }
            .padding(22)
            .pixelPanel(color: Theme.panel, border: Color(hex: item.rarity.tintHex), radius: 6)
            .padding(.horizontal, 26)
            .scaleEffect(appeared ? 1 : 0.9)
            .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.42, dampingFraction: 0.7)) {
                appeared = true
            }
            pulse = true
        }
    }
}
