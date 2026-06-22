import SwiftUI

// MARK: - Pet Companion View (Main Screen)

struct PetCompanionView: View {
    @EnvironmentObject var appState: AppState
    @State private var behavior: PetBehavior = .idle
    @State private var showInfo = false
    @State private var showSettings = false
    
    let behaviorTimer = Timer.publish(every: 4, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack {
            Color(hex: "#0b1120").ignoresSafeArea()
            
            if let pet = appState.activePet {
                // Pet Canvas (full screen)
                PixelPetCanvas(pet: pet, behavior: $behavior, onTap: { appState.petAction() })
                
                // Top bar
                VStack {
                    HStack {
                        // Rarity badge
                        Text(RARITY_LABELS[pet.rarity] ?? "")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(hex: RARITY_COLORS[pet.rarity] ?? "#9ca3af"))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color(hex: RARITY_COLORS[pet.rarity] ?? "#9ca3af").opacity(0.15))
                            .cornerRadius(12)
                        
                        Text("Lv.\(pet.level)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        // Notif bell
                        Button(action: { showSettings.toggle() }) {
                            Image(systemName: "bell.fill")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#9ca3af"))
                        }
                        
                        Button(action: { showSettings.toggle() }) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#5a6d85"))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 60)
                    
                    Spacer()
                }
                
                // Bottom action buttons
                VStack(spacing: 12) {
                    // Steps + Evolution
                    HStack {
                        Image(systemName: "figure.walk")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#94a5b8"))
                        Text("\(appState.totalSteps)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        Text("步")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#5a6d85"))
                        
                        Spacer()
                        
                        Text(STAGE_LABELS[min(pet.evolutionStage - 1, STAGE_LABELS.count - 1)])
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#94a5b8"))
                    }
                    .padding(.horizontal, 20)
                    
                    // Action buttons row
                    HStack(spacing: 12) {
                        ActionButton(icon: "🍖", label: "餵食", color: "#22c55e") { appState.feedPet() }
                        ActionButton(icon: "✋", label: "摸頭", color: "#3b82f6") { appState.petAction() }
                        ActionButton(icon: "🎾", label: "玩", color: "#f59e0b") { appState.playAction() }
                    }
                    
                    // Pet info row
                    HStack(spacing: 16) {
                        Label("\(pet.totalSteps)步", systemImage: "figure.walk")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "#5a6d85"))
                        Text("|")
                            .foregroundColor(Color(hex: "#2a3a5a"))
                        Text("❤️ \(pet.moodValue)%")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "#5a6d85"))
                    }
                    .padding(.bottom, 40)
                }
                
            } else {
                // No pet state
                VStack(spacing: 20) {
                    Spacer()
                    Text("🥚")
                        .font(.system(size: 60))
                    Text("未有寵物")
                        .font(.title3)
                        .foregroundColor(Color(hex: "#94a5b8"))
                    Text("行路孵化第一隻寵物啦！")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5a6d85"))
                    
                    // Progress bar
                    let progress = min(1, Double(appState.totalSteps) / 1000)
                    ProgressView(value: progress)
                        .tint(Color(hex: "#8b5cf6"))
                        .frame(width: 200)
                    Text("\(appState.totalSteps) / 1000 步")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "#5a6d85"))
                    Spacer()
                }
            }
        }
        .onReceive(behaviorTimer) { _ in
            pickRandomBehavior()
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
    }
    
    private func pickRandomBehavior() {
        let roll = Double.random(in: 0...1)
        if roll < 0.35 {
            behavior = Bool.random() ? .walkLeft : .walkRight
        } else if roll < 0.5 {
            behavior = .mischief
        } else {
            behavior = .idle
        }
    }
}

// MARK: - Action Button Component

struct ActionButton: View {
    let icon: String
    let label: String
    let color: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(icon).font(.system(size: 14))
                Text(label).font(.system(size: 12, weight: .semibold))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(hex: color).opacity(0.15))
            .foregroundColor(Color(hex: color))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color(hex: color).opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - Settings View (placeholder)

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            List {
                Section("帳戶") {
                    Text(appState.user?.email ?? "")
                        .foregroundColor(.secondary)
                    Button("登出", role: .destructive) {
                        Task { try? await SupabaseService.shared.signOut()
                            appState.isLoggedIn = false
                            appState.user = nil
                        }
                        dismiss()
                    }
                }
                Section("關於") {
                    Text("Pipz v1.0")
                    Text("陪你每一步")
                }
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }
}
