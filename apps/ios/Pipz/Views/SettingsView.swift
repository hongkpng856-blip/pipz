import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: GameStore

    @AppStorage("sensor.steps") private var sensorSteps = true
    @AppStorage("sensor.bout") private var sensorBout = true
    @AppStorage("sensor.impact") private var sensorImpact = true
    @AppStorage("sensor.shake") private var sensorShake = true
    @AppStorage("sensor.stillness") private var sensorStillness = true

    @AppStorage("ai.enabled") private var aiEnabled = true
    @AppStorage("ai.endpoint") private var aiEndpoint = AIConfig.defaultEndpoint

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

                SectionHeader(text: "AI 即時生成")
                VStack(alignment: .leading, spacing: 10) {
                    toggleRow("用 AI 生成每件物件", isOn: $aiEnabled)
                    Text("已內建。每次發現都會由 AI 即時改名、寫描述，同決定外觀（骨架、耳朵、花紋、主色）。唔需要你自己填任何 key。")
                        .font(.pixelLight(10))
                        .foregroundColor(Theme.dim)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("冇網絡或者 AI 慢嘅時候，會自動用內建離線生成，唔會卡住。")
                        .font(.pixelLight(10))
                        .foregroundColor(Theme.dim)
                        .fixedSize(horizontal: false, vertical: true)

                    labeledField("Endpoint（進階，一般唔需要改）", text: $aiEndpoint)
                    if !AIConfig.usingDefaultEndpoint {
                        Button {
                            aiEndpoint = AIConfig.defaultEndpoint
                        } label: {
                            Text("還原預設 endpoint")
                                .font(.pixel(10))
                                .foregroundColor(Theme.accent)
                        }
                        .buttonStyle(.plain)
                    }
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
