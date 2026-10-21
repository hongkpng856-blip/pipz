import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case collection
    case settings

    var id: String { rawValue }

    var glyph: PixelGlyph {
        switch self {
        case .home: return .home
        case .collection: return .book
        case .settings: return .gear
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: GameStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab: AppTab = .home

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.bg.ignoresSafeArea()

            Group {
                switch tab {
                case .home: HomeView()
                case .collection: CollectionView()
                case .settings: SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            tabBar
        }
        .overlay(alignment: .center) {
            if let item = store.reveal {
                RevealView(item: item) {
                    withAnimation(.easeOut(duration: 0.18)) {
                        store.dismissReveal()
                    }
                }
                .transition(.opacity)
                .zIndex(20)
            }
        }
        .onAppear {
            store.bootstrap()
        }
        .onChange(of: scenePhase) { phase in
            store.scenePhaseChanged(active: phase == .active)
        }
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases) { item in
                Button {
                    tab = item
                } label: {
                    VStack(spacing: 3) {
                        PixelGlyphView(
                            glyph: item.glyph,
                            color: tab == item ? Theme.accent : Theme.dim,
                            size: 20
                        )
                        Text(item.glyph.label)
                            .font(.pixel(9))
                            .foregroundColor(tab == item ? Theme.accent : Theme.dim)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 2)
        .background(
            Theme.panelRaised
                .overlay(Rectangle().fill(Theme.line).frame(height: 2), alignment: .top)
                .ignoresSafeArea(edges: .bottom)
        )
    }
}
