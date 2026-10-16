import XCTest
@testable import MagnetPlayer

final class MagnetPlayerTests: XCTestCase {
    func testDecodeReadyJob() throws {
        let json = """
        {"success":true,"job_id":"abc","status":"ready","progress":100,"title":"Example",
         "file":{"id":"1","name":"E.mp4","size":10,"type":"video/mp4","resolution":1080},
         "stream":{"url":"https://cdn.example/v.m3u8","type":"hls"}}
        """.data(using: .utf8)!
        let j = try JSONDecoder().decode(JobResponse.self, from: json)
        XCTAssertEqual(j.status, .ready); XCTAssertTrue(j.stream!.isHLS); XCTAssertEqual(j.file?.resolutionLabel, "1080p")
    }
    func testDecodeErrorAndMessage() throws {
        let json = #"{"success":false,"job_id":"a","status":"error","error":{"code":"NO_VIDEO_FOUND","message":"x"}}"#.data(using: .utf8)!
        let j = try JSONDecoder().decode(JobResponse.self, from: json)
        XCTAssertEqual(AppFailure.api(j.error!).message, "No playable video was found in this torrent.")
    }
    func testJobStates() {
        XCTAssertTrue(JobStatus.ready.isTerminal); XCTAssertFalse(JobStatus.processing.isTerminal)
        XCTAssertEqual(JobStatus(rawValue: "finding_video"), .findingVideo)
    }
    func testPlayerURLHandling() {
        XCTAssertNil(StreamInfo(url: "http://insecure/v.mp4", type: "mp4").playbackURL)
        XCTAssertNotNil(StreamInfo(url: "https://x/v.mp4", type: "mp4").playbackURL)
        XCTAssertThrowsError(try PlayerService.makeItem(for: StreamInfo(url: "https://x/v.mkv", type: "mkv")))
    }
    func testMagnetCheck() {
        XCTAssertTrue(MagnetService.looksLikeMagnet("magnet:?xt=urn:btih:abc")); XCTAssertFalse(MagnetService.looksLikeMagnet("http://x"))
    }
    func testOrientationLockDefault() { XCTAssertEqual(AppDelegate.orientationLock, .allButUpsideDown) }
}

