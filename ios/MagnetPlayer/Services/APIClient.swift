import Foundation

struct AppConfig {
    static var baseURL: URL {
        let s = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String ?? ""
        return URL(string: s) ?? URL(string: "https://api.example.com")!
    }
    static var apiKey: String { Bundle.main.object(forInfoDictionaryKey: "APP_API_KEY") as? String ?? "" }
}

private struct ErrorWrapper: Decodable { let error: APIErrorBody? }

final class APIClient {
    private let session: URLSession; private let base: URL; private let key: String
    private let decoder = JSONDecoder()
    init(session: URLSession = .shared, base: URL = AppConfig.baseURL, key: String = AppConfig.apiKey) {
        self.session = session; self.base = base; self.key = key
    }

    func send<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil, retries: Int = 2) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path), timeoutInterval: 20)
        req.httpMethod = method
        req.setValue(key, forHTTPHeaderField: "x-api-key")
        if let body { req.setValue("application/json", forHTTPHeaderField: "Content-Type"); req.httpBody = try JSONEncoder().encode(AnyEncodable(body)) }
        var attempt = 0
        while true {
            try Task.checkCancellation()
            do {
                let (data, resp) = try await session.data(for: req)
                let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                if (200..<300).contains(code) {
                    do { return try decoder.decode(T.self, from: data) } catch { throw AppFailure.decoding }
                }
                if let e = try? decoder.decode(ErrorWrapper.self, from: data).error { throw AppFailure.api(e) }
                if code >= 500 && attempt < retries { attempt += 1; try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000); continue }
                throw AppFailure.http(code)
            } catch let e as URLError {
                if e.code == .cancelled { throw AppFailure.cancelled }
                let failure: AppFailure = (e.code == .notConnectedToInternet || e.code == .networkConnectionLost) ? .offline : .timeout
                if attempt < retries && failure == .timeout { attempt += 1; try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000); continue }
                throw failure
            }
        }
    }
}
private struct AnyEncodable: Encodable {
    let value: Encodable; init(_ v: Encodable) { value = v }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
