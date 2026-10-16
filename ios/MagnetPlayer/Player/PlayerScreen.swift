import SwiftUI
import AVKit

/// Wraps AVPlayerViewController: gives timeline, volume, speed, seek, AirPlay, PiP, fullscreen, safe areas.
struct NativePlayer: UIViewControllerRepresentable {
    let player: AVPlayer
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let vc = AVPlayerViewController()
        vc.player = player
        vc.allowsPictureInPicturePlayback = true
        vc.canStartPictureInPictureAutomaticallyFromInline = true
        vc.entersFullScreenWhenPlaybackBegins = false
        vc.updatesNowPlayingInfoCenter = true
        return vc
    }
    func updateUIViewController(_ vc: AVPlayerViewController, context: Context) {}
}

struct PlayerScreen: View {
    let stream: StreamInfo; let title: String
    @Environment(\.dismiss) private var dismiss
    @State private var player: AVPlayer?
    @State private var landscape = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()
            if let player { NativePlayer(player: player).ignoresSafeArea(edges: landscape ? .all : []) }
            if let errorMessage { Text(errorMessage).foregroundColor(.white).padding().frame(maxWidth: .infinity, maxHeight: .infinity) }
            HStack {
                Button { cleanup(); dismiss() } label: { Image(systemName: "xmark.circle.fill").font(.title) }
                Spacer()
                Button { toggleLandscape() } label: { Label("Landscape / Fullscreen", systemImage: "arrow.up.left.and.arrow.down.right").labelStyle(.titleAndIcon) }
                    .buttonStyle(.borderedProminent).tint(.gray)
            }.padding(.horizontal).padding(.top, 8).foregroundColor(.white)
        }
        .statusBarHidden(landscape).persistentSystemOverlays(landscape ? .hidden : .automatic)
        .onAppear(perform: start).onDisappear(perform: cleanup)
    }

    private func start() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try AVAudioSession.sharedInstance().setActive(true)
            let p = AVPlayer(playerItem: try PlayerService.makeItem(for: stream)); player = p; p.play()
        } catch PlayerService.PlayerError.unsupported { errorMessage = "This format (\(stream.type.uppercased())) isn't supported by iOS playback." }
        catch { errorMessage = "Couldn't open the stream." }
    }
    private func cleanup() { player?.pause(); player = nil; AppDelegate.orientationLock = .allButUpsideDown }
    private func toggleLandscape() {
        landscape.toggle()
        let mask: UIInterfaceOrientationMask = landscape ? .landscape : .portrait
        AppDelegate.orientationLock = mask
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return }
        scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask))
        scene.windows.first?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
        if !landscape { AppDelegate.orientationLock = .allButUpsideDown }
    }
}
