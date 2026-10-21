import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: GameStore

    @AppStorage("sensor.steps") private var sensorSteps = true
    @AppStorage("sensor.bout") private var sensorBout = true
    @AppStorage("sensor.impact") private var sensorImpact = true
    @AppStorage("sensor.shake") private var sensorShake = true
    @AppStorage("sensor.stillness") private var sensorStillness = true

    @AppStorage("llm.enabled") private var llmEnabled = false
    @AppStorage("llm.endpoint") private var llmEndpoint = LLMConfig.defaultEndpoint
    @AppStorage("llm.model") private var llmModel = LLMConfig.defaultModel
    @AppStorage("llm.key") private var llmKey = ""

    @State private var showResetConfirm = false
    @State private var showDebug = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                Text("設定")
                    .font(.pixel(20))
                    .foregroundColor(Theme.text)

                SectionHeader(text: "偵測咩")
                VStack(spacing: 0) {
                    toggleRow("行路（每 600 步）", isOn: $sensorSteps)
                    divider
                    toggleRow("行完一段之後", isOn: $sensorBout)
                    divider
                    toggleRow("一下大衝擊", isOn: $sensorImpact)
                    divider
                    toggleRow("搖晃手機", isOn: $sensorShake)
                    divider
                    toggleRow("長時間靜止", isOn: $sensorStillness)
                }
                .pixelPanel(radius: 3)

                SectionHeader(text: "感應器狀態")
                VStack(alignment: .leading, spacing: 6) {
                    Text(store.motion.statusSummary)
                        .font(.pixelLight(11))
                        .foregroundColor(Theme.text)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("iPhone 模擬器冇動作感應器，要用真機先試到。")
                        .font(.pixelLight(10))
                        .foregroundColor(Theme.dim)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .pixelPanel(color: Theme.panelRaised, radius: 3)

                SectionHeader(text: "AI 改名（可選）")
                VStack(alignment: .leading, spacing: 10) {
                    toggleRow("用 AI 幫物件改名同寫描述", isOn: $llmEnabled)
                    Text("唔開都用得，會用內建嘅離線名。開就要填一個 OpenAI 相容嘅 API。")
                        .font(.pixelLight(10))
                        .foregroundColor(Theme.dim)
                        .fixedSize(horizontal: false, vertical: true)

                    labeledField("Endpoint", text: $llmEndpoint)
                    labeledField("Model", text: $llmModel)
                    labeledField("API Key", text: $llmKey, secure: true)

                    Text("Key 只存喺你部手機（UserDefaults／沙盒），唔會離開部機。")
                        .font(.pixelLight(9))
                        .foregroundColor(Theme.dim)
                }
                .padding(12)
                .pixelPanel(radius: 3)

                SectionHeader(text: "進階")
                VStack(spacing: 0) {
                    rowButton("測試面板") { showDebug = true }
                    divider
                    rowButton("重設所有資料", tint: Theme.danger) { showResetConfirm = true }
                }
                .pixelPanel(radius: 3)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Pipz 1.0.0（生活收集版）")
                        .font(.pixel(10))
                        .foregroundColor(Theme.dim)
                    Text("所有收集資料只存喺呢部 iPhone 嘅沙盒，唔會上傳，亦冇帳號。")
                        .font(.pixelLight(10))
                        .foregroundColor(Theme.dim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, 6)
                .padding(.bottom, 96)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
        }
        .sheet(isPresented: $showDebug) {
            DebugView()
                .environmentObject(store)
        }
        .alert(isPresented: $showResetConfirm) {
            Alert(
                title: Text("重設所有資料？"),
                message: Text("圖鑑、夥伴同進度會全部清空，冇得復原。"),
                primaryButton: .destructive(Text("重設")) { store.resetAll() },
                secondaryButton: .cancel(Text("取消"))
            )
        }
    }

    private var divider: some View {
        Rectangle().fill(Theme.line).frame(height: 1)
    }

    private func toggleRow(_ title: String, isOn: Binding<Bool>) -> some View {
        HStack {
            Text(title)
                .font(.pixelLight(12))
                .foregroundColor(Theme.text)
            Spacer()
            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(Theme.accent)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
    }

    private func rowButton(_ title: String, tint: Color = Theme.text, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.pixelLight(12))
                    .foregroundColor(tint)
                Spacer()
                Text("›")
                    .font(.pixel(14))
                    .foregroundColor(Theme.dim)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func labeledField(_ title: String, text: Binding<String>, secure: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.pixel(9))
                .foregroundColor(Theme.dim)
            Group {
                if secure {
                    SecureField("", text: text)
                } else {
                    TextField("", text: text)
                }
            }
            .font(.pixelLight(11))
            .foregroundColor(Theme.text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .padding(8)
            .pixelPanel(color: Theme.bg, radius: 3)
        }
    }
}
