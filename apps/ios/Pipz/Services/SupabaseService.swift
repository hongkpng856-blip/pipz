import Foundation
import Supabase

// MARK: - Supabase API Service

class SupabaseService {
    static let shared = SupabaseService()
    
    let client: SupabaseClient
    
    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://mxbuffmxvyuioidjzaet.supabase.co")!,
            supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YnVmZm14dnl1aW9pZGp6YWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTcyMTMsImV4cCI6MjA2NTE5MzIxM30.q-GE-04p3j4TjQppOQos46xV4KkGxLmhiNqDWMstBBY"
        )
    }
    
    // ── Auth ──
    func signIn(email: String, password: String) async throws -> User {
        let session = try await client.auth.signIn(email: email, password: password)
        let userId = session.user.id.uuidString
        return User(id: userId, email: email)
    }
    
    func signUp(email: String, password: String) async throws -> User {
        let session = try await client.auth.signUp(email: email, password: password)
        let userId = session.user.id.uuidString
        return User(id: userId, email: email)
    }
    
    func signOut() async throws {
        try await client.auth.signOut()
    }
    
    // ── Profile ──
    struct ProfileResponse: Codable {
        let id: String
        let total_steps: Int?
        let today_steps: Int?
    }
    
    func fetchProfile(userId: String) async throws -> (totalSteps: Int, todaySteps: Int) {
        let response = try await client
            .from("profiles")
            .select("total_steps, today_steps")
            .eq("id", value: userId)
            .single()
            .execute()
            .decoded(as: ProfileResponse.self)
        return (response.total_steps ?? 0, response.today_steps ?? 0)
    }
    
    // ── Pets ──
    struct PetResponse: Codable {
        let id: String
        let user_id: String
        let name: String
        let species_id: String
        let rarity: String
        let level: Int
        let xp: Int
        let total_steps: Int
        let evolution_stage: Int
        let status: String
        let mood: String
        let mood_value: Int
        let last_fed_at: String?
        let last_interaction_at: String?
        let created_at: String?
        let is_for_sale: Bool?
        let price: Int?
    }
    
    func fetchPets(userId: String) async throws -> [Pet] {
        let response = try await client
            .from("pets")
            .select()
            .eq("user_id", value: userId)
            .execute()
        let raw: [PetResponse] = try response.decoded()
        return raw.map { mapPetResponse($0) }
    }
    
    func updatePet(_ pet: Pet) async throws {
        try await client
            .from("pets")
            .update([
                "mood": pet.mood.rawValue,
                "mood_value": pet.moodValue,
                "xp": pet.xp,
                "last_fed_at": ISO8601DateFormatter().string(from: pet.lastFedAt),
                "total_steps": pet.totalSteps,
            ])
            .eq("id", value: pet.id)
            .execute()
    }
    
    // ── Notifications ──
    func createNotification(userId: String, type: String, title: String, message: String) async throws {
        struct NotifPayload: Codable {
            let action = "create"
            let userId: String
            let type: String
            let title: String
            let message: String
        }
        let payload = NotifPayload(userId: userId, type: type, title: title, message: message)
        _ = try await client
            .rpc(fn: "create_notification", params: try! JSONEncoder().encode(payload))
            .execute()
    }
    
    // ── Mapping ──
    private func mapPetResponse(_ r: PetResponse) -> Pet {
        let rarity = Rarity(rawValue: r.rarity) ?? .common
        let moodVal = max(0, min(100, r.mood_value))
        let mood: Mood = moodVal < 30 ? .hungry : moodVal < 50 ? .sad : Mood(rawValue: r.mood) ?? .happy
        return Pet(
            id: r.id,
            userId: r.user_id,
            name: r.name,
            speciesId: r.species_id,
            rarity: rarity,
            level: r.level,
            xp: r.xp,
            totalSteps: r.total_steps,
            evolutionStage: r.evolution_stage,
            status: PetStatus(rawValue: r.status) ?? .baby,
            stats: PetStats(speed: 10, luck: 10, charm: 10, energy: 10),
            mood: mood,
            moodValue: moodVal,
            lastFedAt: ISO8601DateFormatter().date(from: r.last_fed_at ?? "") ?? Date(),
            lastInteractionAt: ISO8601DateFormatter().date(from: r.last_interaction_at ?? "") ?? Date(),
            createdAt: ISO8601DateFormatter().date(from: r.created_at ?? "") ?? Date(),
            isForSale: r.is_for_sale ?? false,
            price: r.price ?? 0
        )
    }
}
