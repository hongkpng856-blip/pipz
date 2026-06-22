// ── Pipz iOS App Entry ──
// 陪你每一步 — 行路養寵物

import SwiftUI
import Supabase

@main
struct PipzApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

// MARK: - Global App State

class AppState: ObservableObject {
    @Published var isLoggedIn = false
    @Published var user: User?
    @Published var pets: [Pet] = []
    @Published var activePetIndex = 0
    @Published var totalSteps = 0
    @Published var todaySteps = 0
    
    var activePet: Pet? {
        guard !pets.isEmpty, activePetIndex < pets.count else { return nil }
        return pets[activePetIndex]
    }
    
    private let api = SupabaseService.shared
    
    init() {
        checkAuth()
    }
    
    func checkAuth() {
        Task {
            if let session = try? await api.client.auth.session {
                isLoggedIn = true
                user = User(id: session.user.id.uuidString, email: session.user.email ?? "")
                await loadData()
            }
        }
    }
    
    func loadData() async {
        guard let user = user else { return }
        let profile = try? await api.fetchProfile(userId: user.id)
        if let p = profile {
            totalSteps = p.totalSteps
            todaySteps = p.todaySteps
        }
        pets = (try? await api.fetchPets(userId: user.id)) ?? []
    }
    
    // ── Pet actions ──
    func feedPet() {
        guard var pet = activePet else { return }
        pet.mood = .happy
        pet.moodValue = 100
        pet.lastFedAt = Date()
        pet.xp += 10
        updatePet(pet)
    }
    
    func petAction() {
        guard var pet = activePet else { return }
        pet.mood = .happy
        pet.moodValue = min(100, pet.moodValue + 15)
        updatePet(pet)
        createNotification(type: "pet_care", title: "🍖 寵物餵食咗", message: "\(pet.name)好開心！")
    }
    
    func playAction() {
        guard var pet = activePet else { return }
        pet.mood = .excited
        pet.moodValue = min(100, pet.moodValue + 20)
        pet.xp += 5
        updatePet(pet)
    }
    
    private func updatePet(_ pet: Pet) {
        guard let idx = pets.firstIndex(where: { $0.id == pet.id }) else { return }
        pets[idx] = pet
        Task { try? await api.updatePet(pet) }
    }
    
    private func createNotification(type: String, title: String, message: String) {
        guard let user = user else { return }
        Task { try? await api.createNotification(userId: user.id, type: type, title: title, message: message) }
    }
}
