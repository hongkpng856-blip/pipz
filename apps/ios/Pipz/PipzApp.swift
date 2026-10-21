import SwiftUI

@main
struct PipzApp: App {
    @StateObject private var store = GameStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
    }
}
