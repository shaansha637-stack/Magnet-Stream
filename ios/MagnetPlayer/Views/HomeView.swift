import SwiftUI

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @State private var playing = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    Text("MAGNET PLAYER").font(.system(.title, design: .rounded).weight(.heavy)).padding(.top, 8)
                    TextField("magnet:?xt=urn:btih:...", text: $vm.magnet, axis: .vertical)
                        .lineLimit(1...4).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .padding(12).background(Color(.secondarySystemBackground)).cornerRadius(10)
                    HStack {
                        Button("Paste") { vm.magnet = UIPasteboard.general.string ?? vm.magnet }.buttonStyle(.bordered)
                        Button("PROCESS") { vm.process() }.buttonStyle(.borderedProminent).disabled(!vm.canProcess)
                    }
                    switch vm.phase {
                    case .idle: EmptyView()
                    case .working: ProcessingView(job: vm.job, cancel: vm.cancel)
                    case .failed:
                        VStack(spacing: 8) {
                            Text(vm.errorText ?? "Error").foregroundColor(.red).multilineTextAlignment(.center)
                            Button("Retry") { vm.process() }.buttonStyle(.bordered)
                        }
                    case .ready: ReadyView(vm: vm) { playing = true }
                    }
                    if !vm.recents.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Recent Jobs").font(.headline)
                            ForEach(vm.recents) { r in
                                Button { vm.open(recent: r) } label: {
                                    HStack { Text(r.title).lineLimit(1); Spacer(); Text(r.date, style: .date).font(.caption).foregroundColor(.secondary) }
                                }.buttonStyle(.plain); Divider()
                            }
                        }
                    }
                }.padding()
            }
            .navigationBarHidden(true)
            .fullScreenCover(isPresented: $playing) {
                if let s = vm.stream { PlayerScreen(stream: s, title: vm.job?.title ?? "") }
            }
        }.navigationViewStyle(.stack)
    }
}

struct ProcessingView: View {
    let job: JobResponse?; let cancel: () -> Void
    var body: some View {
        VStack(spacing: 10) {
            ProgressView(value: Double(job?.progress ?? 0), total: 100)
            Text(job?.status.label ?? "Validating magnet...").font(.headline)
            if let p = job?.progress, p > 0 { Text("\(p)%").foregroundColor(.secondary) }
            Button("Cancel", role: .destructive, action: cancel).buttonStyle(.bordered)
        }
    }
}

struct ReadyView: View {
    @ObservedObject var vm: HomeViewModel; let play: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(vm.job?.title ?? "Video").font(.title3.bold())
            if let f = vm.selected {
                row("Video File", f.name); row("Resolution", f.resolutionLabel)
                row("File Size", ByteCountFormatter.string(fromByteCount: f.size, countStyle: .file))
            }
            row("Format", vm.stream?.type.uppercased() ?? "-")
            if vm.stream?.likelyUnsupported == true { Text("This format may not play natively on iOS.").font(.footnote).foregroundColor(.orange) }
            if let files = vm.job?.files, vm.job?.needsSelection == true {
                Text("Episodes (server prepared the first for playback)").font(.caption).foregroundColor(.secondary)
                ForEach(files, id: \.identity) { f in
                    Text("• " + (f.season.flatMap { s in f.episode.map { "S\(s)E\($0) " } } ?? "") + f.name).font(.caption).lineLimit(1)
                }
            }
            Button(action: play) { Label("PLAY", systemImage: "play.fill").frame(maxWidth: .infinity) }.buttonStyle(.borderedProminent).controlSize(.large)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func row(_ k: String, _ v: String) -> some View { HStack { Text(k).foregroundColor(.secondary); Spacer(); Text(v).lineLimit(1) } }
}

