import Foundation
import CoreMotion

/// 動作感應：步數（CMPedometer）、活動類型（CMMotionActivityManager）、
/// 衝擊 + 搖晃（CMMotionManager deviceMotion）。
@MainActor
final class MotionService: ObservableObject {

    @Published var activity: ActivityKind = .unknown
    @Published var steps: Int = 0
    @Published var peakAcceleration: Double = 0
    @Published var running = false
    @Published var sampleRate: Double = 0
    @Published var authStatusText: String = "未授權"

    var onSignal: ((SensorSignal) -> Void)?

    private let pedometer = CMPedometer()
    private let activityManager = CMMotionActivityManager()
    private let motionManager = CMMotionManager()
    private let motionQueue: OperationQueue = {
        let q = OperationQueue()
        q.maxConcurrentOperationCount = 1
        q.qualityOfService = .userInitiated
        return q
    }()

    private var startDate = Date()
    private var lastCumulativeSteps = 0
    private var lastImpactAt = Date.distantPast
    private var lastShakeAt = Date.distantPast
    private var crossingTimes: [Date] = []
    private var previousMagnitude: Double = 0
    private var sampleCounter = 0
    private var sampleTimer: Timer?

    var isPedometerAvailable: Bool { CMPedometer.isStepCountingAvailable() }
    var isActivityAvailable: Bool { CMMotionActivityManager.isActivityAvailable() }
    var isDeviceMotionAvailable: Bool { motionManager.isDeviceMotionAvailable }

    // MARK: 開關

    func start() {
        guard !running else { return }
        running = true
        startDate = Date()
        lastCumulativeSteps = 0
        refreshAuthStatus()
        startPedometer()
        startActivityUpdates()
        startDeviceMotion()
    }

    func stop() {
        running = false
        pedometer.stopUpdates()
        activityManager.stopActivityUpdates()
        motionManager.stopDeviceMotionUpdates()
        sampleTimer?.invalidate()
        sampleTimer = nil
        sampleRate = 0
    }

    func resetSteps() {
        pedometer.stopUpdates()
        steps = 0
        lastCumulativeSteps = 0
        startDate = Date()
        if running { startPedometer() }
    }

    private func refreshAuthStatus() {
        switch CMMotionActivityManager.authorizationStatus() {
        case .authorized: authStatusText = "已授權"
        case .denied: authStatusText = "被拒絕"
        case .restricted: authStatusText = "受限"
        case .notDetermined: authStatusText = "未問"
        @unknown default: authStatusText = "未知"
        }
    }

    // MARK: 步數

    private func startPedometer() {
        guard CMPedometer.isStepCountingAvailable() else { return }
        // 先取今日累計（唔影響遊戲觸發，只係顯示）
        let startOfDay = Calendar.current.startOfDay(for: Date())
        pedometer.queryPedometerData(from: startOfDay, to: Date()) { [weak self] data, _ in
            guard let self, let data else { return }
            let today = data.numberOfSteps.intValue
            Task { @MainActor in
                self.steps = today
                self.onSignal?(.steps(total: today, delta: 0))
            }
        }

        pedometer.startUpdates(from: Date()) { [weak self] data, _ in
            guard let self, let data else { return }
            let cumulative = data.numberOfSteps.intValue
            Task { @MainActor in
                let delta = max(0, cumulative - self.lastCumulativeSteps)
                self.lastCumulativeSteps = cumulative
                self.steps += delta
                if delta > 0 {
                    self.onSignal?(.steps(total: self.steps, delta: delta))
                }
            }
        }
    }

    // MARK: 活動類型

    private func startActivityUpdates() {
        guard CMMotionActivityManager.isActivityAvailable() else { return }
        activityManager.startActivityUpdates(to: motionQueue) { [weak self] motionActivity in
            guard let self, let motionActivity else { return }
            let kind = MotionService.map(motionActivity)
            Task { @MainActor in
                if kind != self.activity {
                    self.activity = kind
                    self.onSignal?(.activity(kind))
                }
            }
        }
    }

    private static func map(_ activity: CMMotionActivity) -> ActivityKind {
        if activity.running { return .running }
        if activity.cycling { return .cycling }
        if activity.automotive { return .automotive }
        if activity.walking { return .walking }
        if activity.stationary { return .stationary }
        return .unknown
    }

    // MARK: 衝擊 / 搖晃

    private func startDeviceMotion() {
        guard motionManager.isDeviceMotionAvailable else { return }
        motionManager.deviceMotionUpdateInterval = 1.0 / 30.0
        motionManager.startDeviceMotionUpdates(to: motionQueue) { [weak self] motion, _ in
            guard let self, let motion else { return }
            let a = motion.userAcceleration
            let magnitude = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
            Task { @MainActor in
                self.process(magnitude: magnitude)
            }
        }

        sampleCounter = 0
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.sampleRate = Double(self.sampleCounter)
                self.sampleCounter = 0
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        sampleTimer = timer
    }

    private func process(magnitude: Double) {
        sampleCounter += 1
        peakAcceleration = max(peakAcceleration * 0.98, magnitude)

        let now = Date()

        // 大衝擊：一下過門檻，冷卻 8 秒
        if magnitude >= 2.1, now.timeIntervalSince(lastImpactAt) > 8 {
            lastImpactAt = now
            onSignal?(.impact(peak: magnitude))
        }

        // 搖晃：1.5 秒內多次穿越 1.0g 上升
        if magnitude > 1.0 && previousMagnitude <= 1.0 {
            crossingTimes.append(now)
        }
        previousMagnitude = magnitude
        crossingTimes.removeAll { now.timeIntervalSince($0) > 1.5 }

        if crossingTimes.count >= 4, now.timeIntervalSince(lastShakeAt) > 6 {
            lastShakeAt = now
            let count = crossingTimes.count
            crossingTimes.removeAll()
            onSignal?(.shake(count: count))
        }
    }

    var statusSummary: String {
        var parts: [String] = []
        parts.append("步數感應：\(isPedometerAvailable ? "有" : "冇")")
        parts.append("活動感應：\(isActivityAvailable ? "有" : "冇")")
        parts.append("陀螺儀：\(isDeviceMotionAvailable ? "有" : "冇")")
        parts.append("授權：\(authStatusText)")
        return parts.joined(separator: " ・ ")
    }
}
