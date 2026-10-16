import AVFoundation

enum PlayerService {
    enum PlayerError: Error { case badURL, unsupported }
    /// Picks the right AVPlayerItem for HLS or progressive files automatically.
    static func makeItem(for stream: StreamInfo) throws -> AVPlayerItem {
        guard let url = stream.playbackURL else { throw PlayerError.badURL }
        if stream.likelyUnsupported { throw PlayerError.unsupported }
        return AVPlayerItem(url: url)   // AVFoundation handles HLS (.m3u8) and MP4 through the same API
    }
}

