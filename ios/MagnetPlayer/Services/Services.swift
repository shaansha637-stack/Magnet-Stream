import Foundation

struct MagnetService {
    let client: APIClient
    func submit(_ magnet: String) async throws -> SubmitResponse {
        struct Body: Encodable { let magnet: String }
        return try await client.send("api/magnet", method: "POST", body: Body(magnet: magnet))
    }
    static func looksLikeMagnet(_ s: String) -> Bool {
        s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().hasPrefix("magnet:?xt=urn:btih:")
    }
}
struct JobService {
    let client: APIClient
    func status(_ id: String) async throws -> JobResponse { try await client.send("api/status/\(id)") }
    /// Polls until terminal state; cancellable via Task cancellation.
    func poll(_ id: String, interval: TimeInterval = 2.5, onUpdate: @MainActor (JobResponse) -> Void) async throws -> JobResponse {
        while true {
            let r = try await status(id)
            await onUpdate(r)
            if r.status.isTerminal { return r }
            try await Task.sleep(nanoseconds: UInt64(interval * 1e9))
        }
    }
}
@MainActor
final class RecentStore {
    private let key = "recent_jobs"
    func load() -> [RecentJob] {
        guard let d = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([RecentJob].self, from: d)) ?? []
    }
    func add(_ j: RecentJob) {
        var all = load().filter { $0.id != j.id }; all.insert(j, at: 0)
        if let d = try? JSONEncoder().encode(Array(all.prefix(10))) { UserDefaults.standard.set(d, forKey: key) }
    }
}

