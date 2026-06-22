import SwiftUI

// MARK: - Pet Behavior State

enum PetBehavior: CaseIterable {
    case idle, walkLeft, walkRight, mischief, happy
}

// MARK: - Pixel Pet Renderer
// Renders the pixel art pet on a SwiftUI Canvas with autonomous behavior

struct PixelPetCanvas: View {
    let pet: Pet
    @Binding var behavior: PetBehavior
    let onTap: () -> Void
    
    @State private var hearts: [Heart] = []
    @State private var showTapHint = true
    let timer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()
    
    var body: some View {
        TimelineView(.animation(minimumInterval: 1/60)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                drawScene(context: &context, size: size, time: time)
                drawPetOnCanvas(context: &context, size: size, time: time)
                drawMoodAndHearts(context: &context, size: size, time: time)
                
                if showTapHint {
                    var hint = context
                    hint.opacity = 0.4 + sin(time * 4) * 0.2
                    hint.draw(Text("👆 Tap me!").font(.system(size: 12)).foregroundColor(.gray),
                              at: CGPoint(x: size.width/2, y: size.height - 30))
                }
            }
            .onTapGesture { onTap(); addHeart() }
        }
        .ignoresSafeArea()
        .onReceive(timer) { _ in if showTapHint { showTapHint = false } }
    }
    
    private func addHeart() {
        hearts.append(Heart(x: CGFloat.random(in: -20...20), y: 0, life: 1.0))
    }
    
    // MARK: - Scene Drawing
    
    private func drawScene(context: inout GraphicsContext, size: CGSize, time: TimeInterval) {
        let W = size.width; let H = size.height
        let floorY = H * 0.38
        
        // Wall
        context.fill(Path(CGRect(x: 0, y: 0, width: W, height: floorY)), with: .color(Color(hex: "#16122a")))
        // Wainscoting
        for i in 0..<8 {
            let lx = (CGFloat(i) / 8) * W
            context.fill(Path(CGRect(x: lx, y: 0, width: 1, height: floorY)), with: .color(Color(hex: "#1e1a35")))
        }
        // Baseboard
        context.fill(Path(CGRect(x: 0, y: floorY - 4, width: W, height: 4)), with: .color(Color(hex: "#2a2550")))
        
        // Floor tiles (checkered, perspective)
        for y in 0..<12 {
            for x in 0..<8 {
                let isA = (x + y) % 2 == 0
                let tileW = W / 8 * 1.5
                let tileH: CGFloat = 12
                let tx = CGFloat(x) * tileW - (time * 0.5).truncatingRemainder(dividingBy: tileW) * 0
                let ty = floorY + CGFloat(y) * tileH
                context.fill(
                    Path(CGRect(x: tx, y: ty, width: tileW, height: tileH)),
                    with: .color(isA ? Color(hex: "#2a2040") : Color(hex: "#1e1835"))
                )
            }
        }
        
        // Rug (rounded rect)
        let rugW = W * 0.75; let rugH = H * 0.2
        let rugX = (W - rugW) / 2; let rugY = floorY + (H - floorY - rugH) * 0.2
        let rugPath = Path(roundedRect: CGRect(x: rugX, y: rugY, width: rugW, height: rugH), cornerRadius: 12)
        context.fill(rugPath, with: .color(Color(hex: "#3a2a5a")))
        context.stroke(rugPath, with: .color(Color(hex: "#4a3a6a")), lineWidth: 1)
    }
    
    // MARK: - Pet Drawing
    
    private func drawPetOnCanvas(context: inout GraphicsContext, size: CGSize, time: TimeInterval) {
        let W = size.width; let H = size.height
        let floorY = H * 0.38
        let rugH = H * 0.2
        let rugY = floorY + (H - floorY - rugH) * 0.2
        let groundY = rugY + rugH * 0.6
        
        let (xOff, yOff) = getOffsets(time: time)
        let pixelSize: CGFloat = max(5, min(W, H) / 18)
        let petSize: CGFloat = pixelSize * 16
        
        // Shadow
        let shadowPath = Path(ellipseIn: CGRect(x: W/2 + xOff - petSize*0.3, y: groundY + 2, width: petSize*0.6, height: 5))
        context.fill(shadowPath, with: .color(.black.opacity(0.12)))
        
        // Pet body
        let drawX = W/2 + xOff - petSize/2
        let drawY = groundY - petSize + yOff
        let mainColor = Color(hex: RARITY_COLORS[pet.rarity] ?? "#9ca3af")
        let secColor = Color(hex: Pet.secondaryColor(pet.rarity))
        
        // Body (oval)
        let bodyRect = CGRect(x: drawX + petSize*0.15, y: drawY + petSize*0.3,
                              width: petSize*0.7, height: petSize*0.55)
        context.fill(Path(ellipseIn: bodyRect), with: .color(mainColor))
        
        // Head (circle)
        let headRect = CGRect(x: drawX + petSize*0.1, y: drawY + petSize*0.05,
                              width: petSize*0.8, height: petSize*0.5)
        context.fill(Path(ellipseIn: headRect), with: .color(mainColor))
        
        // Eyes
        let eyeY = drawY + petSize*0.22
        let eyeSize = petSize * 0.08
        // White
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.25, y: eyeY, width: eyeSize*2, height: eyeSize*2.5)), with: .color(.white))
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.55, y: eyeY, width: eyeSize*2, height: eyeSize*2.5)), with: .color(.white))
        // Pupils
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.3, y: eyeY + eyeSize*0.5, width: eyeSize, height: eyeSize*1.5)), with: .color(.black))
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.6, y: eyeY + eyeSize*0.5, width: eyeSize, height: eyeSize*1.5)), with: .color(.black))
        
        // Ears
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.05, y: drawY, width: petSize*0.2, height: petSize*0.2)), with: .color(secColor))
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.75, y: drawY, width: petSize*0.2, height: petSize*0.2)), with: .color(secColor))
        
        // Feet
        let footBob = behavior == .walkLeft || behavior == .walkRight ? sin(time * 10) * 2 : 0
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.15, y: drawY + petSize*0.75 + footBob, width: petSize*0.2, height: petSize*0.12)), with: .color(secColor))
        context.fill(Path(ellipseIn: CGRect(x: drawX + petSize*0.65, y: drawY + petSize*0.75 - footBob, width: petSize*0.2, height: petSize*0.12)), with: .color(secColor))
    }
    
    // MARK: - Mood & Hearts
    
    private func drawMoodAndHearts(context: inout GraphicsContext, size: CGSize, time: TimeInterval) {
        let W = size.width; let H = size.height
        let floorY = H * 0.38
        let rugH = H * 0.2
        let rugY = floorY + (H - floorY - rugH) * 0.2
        let groundY = rugY + rugH * 0.6
        let pixelSize: CGFloat = max(5, min(W, H) / 18)
        let petSize = pixelSize * 16
        let (xOff, yOff) = getOffsets(time: time)
        
        // Mood emoji above head
        let emoji = MOOD_EMOJI[pet.mood] ?? "😊"
        context.draw(Text(emoji).font(.system(size: 22)),
                     at: CGPoint(x: W/2 + xOff, y: groundY - petSize - 18 + yOff))
        
        // Hearts
        hearts = hearts.filter { $0.life > 0 }
        for i in hearts.indices {
            var hCtx = context
            hCtx.opacity = hearts[i].life
            hCtx.draw(Text("❤️").font(.system(size: 14)),
                      at: CGPoint(x: W/2 + xOff + hearts[i].x, y: groundY - petSize - 30 + hearts[i].y))
            hearts[i].y -= 0.8
            hearts[i].life -= 0.025
        }
    }
    
    // MARK: - Behavior Offsets
    
    private func getOffsets(time: TimeInterval) -> (x: CGFloat, y: CGFloat) {
        switch behavior {
        case .idle:
            return (0, sin(time * 2.5) * 2)
        case .walkLeft:
            return (-abs(sin(time * 0.8)) * 80, abs(sin(time * 8)) * 3)
        case .walkRight:
            return (abs(sin(time * 0.8)) * 80, abs(sin(time * 8)) * 3)
        case .mischief:
            return (sin(time * 6) * 20, -abs(sin(time * 10)) * 12)
        case .happy:
            return (0, -abs(sin(time * 6)) * 10)
        }
    }
}

// MARK: - Supporting Types

struct Heart {
    var x: CGFloat
    var y: CGFloat
    var life: CGFloat
}
