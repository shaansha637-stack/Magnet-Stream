import Foundation

enum JobStatus: String, Codable {
    case queued, validating, submitting, processing, downloading, scanning
    case findingVideo = "finding_video", creatingStream = "creating_stream", ready, error, expired
    var label: String {
        switch self {
        case .queued, .validating: return "Validating magnet..."
        case .submitting: return "Submitting..."
        case .processing, .downloading: return "Processing..."
        case .scanning, .findingVideo: return "Finding video..."
        case .creatingStream: return "Preparing stream..."
        case .ready: return "Ready"
        case .error: return "Failed"
        case .expired: return "Expired"
        }
    }
    var isTerminal: Bool { self == .ready || self == .error || self == .expired }
}

struct APIErrorBody: Codable, Equatable { let code: String; let message: String }
struct SubmitResponse: Codable { let jobId: String; let status: JobStatus
    enum CodingKeys: String, CodingKey { case jobId = "job_id", status } }
struct VideoFile: Codable, Equatable, Identifiable {
    let id: String?; let name: String; let size: Int64; let type: String?
    let season: Int?; let episode: Int?; let resolution: Int?
    var identity: String { id ?? name }
    var resolutionLabel: String { resolution.map { "\($0)p" } ?? "Unknown" }
}
struct StreamInfo: Codable, Equatable {
    let url: String; let type: String
    var isHLS: Bool { type.lowercased() == "hls" }
    var playbackURL: URL? { URL(string: url).flatMap { $0.scheme?.lowercased() == "https" ? $0 : nil } }
    /// AVPlayer cannot decode these containers natively.
    var likelyUnsupported: Bool { ["mkv", "avi", "webm"].contains(type.lowercased()) }
}
struct JobResponse: Codable {
    let success: Bool; let jobId: String; let status: JobStatus; let progress: Int?
    let title: String?; let file: VideoFile?; let stream: StreamInfo?; let files: [VideoFile]?
    let needsSelection: Bool?; let error: APIErrorBody?
    enum CodingKeys: String, CodingKey {
        case success, status, progress, title, file, stream, files, error
        case jobId = "job_id", needsSelection = "needs_selection"
    }
}
struct RecentJob: Codable, Identifiable, Equatable { let id: String; var title: String; var date: Date }

enum AppFailure: Error, Equatable {
    case api(APIErrorBody), offline, timeout, decoding, http(Int), cancelled
    var message: String {
        switch self {
        case .offline: return "You appear to be offline."
        case .timeout: return "The request timed out. Please try again."
        case .decoding: return "Unexpected response from the server."
        case .http(let c): return "Server error (\(c))."
        case .cancelled: return "Cancelled."
        case .api(let e):
            switch e.code {
            case "INVALID_MAGNET": return "That doesn't look like a valid magnet link."
            case "UNAUTHORIZED": return "The app isn't authorized with the server."
            case "RATE_LIMITED": return "Too many requests. Wait a moment and retry."
            case "PROVIDER_AUTH_ERROR": return "The storage provider login needs attention (server side)."
            case "PROVIDER_LIMIT": return "The storage provider is out of space or at its limit."
            case "MAGNET_REJECTED": return "The provider rejected this magnet."
            case "PROCESSING_FAILED": return "Processing failed. Please retry."
            case "NO_VIDEO_FOUND": return "No playable video was found in this torrent."
            case "STREAM_UNAVAILABLE": return "A stream couldn't be created for this file."
            case "TIMEOUT": return "Processing took too long."
            case "NETWORK_ERROR": return "The server couldn't reach the provider."
            default: return "Something went wrong on the server."
            }
        }
    }
}

