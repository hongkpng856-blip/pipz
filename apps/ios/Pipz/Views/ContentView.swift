import SwiftUI

// MARK: - Content View (Root)

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        if appState.isLoggedIn {
            PetCompanionView()
                .environmentObject(appState)
        } else {
            AuthView()
                .environmentObject(appState)
        }
    }
}

// MARK: - Auth View

struct AuthView: View {
    @EnvironmentObject var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMsg: String?
    
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Text("Pipz")
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(.white)
            
            Text("陪你每一步")
                .font(.system(size: 16))
                .foregroundColor(Color(hex: "#94a5b8"))
            
            Spacer().frame(height: 40)
            
            VStack(spacing: 12) {
                TextField("Email", text: $email)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#141b2d"))
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#1e2a45"), lineWidth: 1))
                    .foregroundColor(.white)
                    .autocapitalization(.none)
                
                SecureField("Password", text: $password)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#141b2d"))
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#1e2a45"), lineWidth: 1))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 32)
            
            if let err = errorMsg {
                Text(err).font(.system(size: 12)).foregroundColor(.red)
            }
            
            Button(action: handleAuth) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(isSignUp ? "註冊" : "登入")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(hex: "#8b5cf6"))
            .foregroundColor(.white)
            .cornerRadius(14)
            .padding(.horizontal, 32)
            
            Button(action: { isSignUp.toggle() }) {
                Text(isSignUp ? "已有帳戶？登入" : "未有帳戶？註冊")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "#8b5cf6"))
            }
            
            Spacer()
        }
        .background(Color(hex: "#0b1120").ignoresSafeArea())
    }
    
    private func handleAuth() {
        guard !email.isEmpty, !password.isEmpty else { return }
        isLoading = true; errorMsg = nil
        Task {
            do {
                let api = SupabaseService.shared
                if isSignUp {
                    _ = try await api.signUp(email: email, password: password)
                }
                let user = try await api.signIn(email: email, password: password)
                await MainActor.run {
                    appState.user = user
                    appState.isLoggedIn = true
                    appState.checkAuth()
                }
            } catch {
                await MainActor.run { errorMsg = error.localizedDescription }
            }
            await MainActor.run { isLoading = false }
        }
    }
}
