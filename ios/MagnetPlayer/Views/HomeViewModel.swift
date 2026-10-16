import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
    enum Phase: Equatable { case idle, working, ready, failed }
    @Published var magnet = ""
    @Published var phase: Phase = .idle
    @Published var job: JobResponse?
    @Published var selected: VideoFile?
    @Published var errorText: String?
    @Published var recents: [RecentJob] = []
    private var task: Task<Void, Never>?
    private let client = APIClient(); private let store = RecentStore()
    init() { recents = store.load() }

    var canProcess: Bool { MagnetService.looksLikeMagnet(magnet) && phase != .working }

    func process() {
        guard canProcess else { errorText = "Paste a valid magnet link."; phase = .failed; return }
        phase = .working; errorText = nil; job = nil
        task = Task {
            do {
                let sub = try await MagnetService(client: client).submit(magnet)
                let final = try await JobService(client: client).poll(sub.jobId) { [weak self] in self?.job = $0 }
                job = final
                switch final.status {
                case .ready:
                    selected = final.file
                    phase = .ready
                    store.add(RecentJob(id: final.jobId, title: final.title ?? "Video", date: Date())); recents = store.load()
                case .error: fail(.api(final.error ?? APIErrorBody(code: "SERVER_ERROR", message: "")))
                default: fail(.api(APIErrorBody(code: "TIMEOUT", message: "expired")))
                }
            } catch let f as AppFailure { if f != .cancelled { fail(f) } else { phase = .idle } }
            catch is CancellationError { phase = .idle }
            catch { fail(.offline) }
        }
    }
    func cancel() { task?.cancel(); phase = .idle }
    private func fail(_ f: AppFailure) { errorText = f.message; phase = .failed }

    /// Stream for selected file; the backend only pre-signs the primary file's URL.
    var stream: StreamInfo? { job?.stream }
    func open(recent: RecentJob) {
        phase = .working
        task = Task {
            do {
                let r = try await JobService(client: client).status(recent.id)
                if r.status == .ready { job = r; selected = r.file; phase = .ready } else { fail(.api(r.error ?? APIErrorBody(code: "TIMEOUT", message: ""))) }
            } catch { fail(.offline) }
        }
    }
}

