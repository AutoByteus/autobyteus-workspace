import UIKit

/// The native screens' look (autobyteus-279), the same palette and sizes as Android's `ShellColors` / `ShellUi` and the web
/// phone screens (Tailwind's slate, blue, green, amber, red).
enum ShellColors {
    static let white = UIColor.white
    static let slate50 = UIColor(hex: 0xF8FAFC)
    static let slate100 = UIColor(hex: 0xF1F5F9)
    static let slate200 = UIColor(hex: 0xE2E8F0)
    static let slate300 = UIColor(hex: 0xCBD5E1)
    static let slate400 = UIColor(hex: 0x94A3B8)
    static let slate500 = UIColor(hex: 0x64748B)
    static let slate600 = UIColor(hex: 0x475569)
    static let slate700 = UIColor(hex: 0x334155)
    static let slate900 = UIColor(hex: 0x0F172A)
    static let blue50 = UIColor(hex: 0xEFF6FF)
    static let blue600 = UIColor(hex: 0x2563EB)
    static let blue700 = UIColor(hex: 0x1D4ED8)
    static let green500 = UIColor(hex: 0x22C55E)
    static let amber500 = UIColor(hex: 0xF59E0B)
    static let amber700 = UIColor(hex: 0xB45309)
    static let red50 = UIColor(hex: 0xFEF2F2)
    static let red600 = UIColor(hex: 0xDC2626)
    static let red700 = UIColor(hex: 0xB91C1C)
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

enum ShellUI {
    /// The widest the native screens' content grows: on iPad the first screen is one centered 448 pt column (UIS-001).
    static let columnMaxWidth: CGFloat = 448

    static func label(_ text: String, size: CGFloat, color: UIColor = ShellColors.slate900, weight: UIFont.Weight = .regular, lines: Int = 0) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.numberOfLines = lines
        label.adjustsFontForContentSizeCategory = true
        return label
    }

    static func symbol(_ name: String, size: CGFloat, color: UIColor, weight: UIImage.SymbolWeight = .regular) -> UIImageView {
        let view = UIImageView(image: UIImage(systemName: name, withConfiguration: UIImage.SymbolConfiguration(pointSize: size, weight: weight)))
        view.tintColor = color
        view.contentMode = .scaleAspectFit
        view.isAccessibilityElement = false
        return view
    }

    static func divider() -> UIView {
        let view = UIView()
        view.backgroundColor = ShellColors.slate200
        view.heightAnchor.constraint(equalToConstant: 1 / UIScreen.main.scale).isActive = true
        return view
    }

    /// The blue full-width button (Scan, Connect): 56 pt (or `height`), rounded 16, with an optional symbol.
    static func primaryButton(_ title: String, symbol: String? = nil, height: CGFloat = 56, action: @escaping () -> Void) -> UIButton {
        var configuration = UIButton.Configuration.filled()
        configuration.title = title
        configuration.baseBackgroundColor = ShellColors.blue600
        configuration.baseForegroundColor = .white
        configuration.cornerStyle = .fixed
        configuration.background.cornerRadius = 16
        configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var updated = attributes
            updated.font = .systemFont(ofSize: 17, weight: .semibold)
            return updated
        }
        if let symbol {
            configuration.image = UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold))
            configuration.imagePadding = 10
        }
        let button = UIButton(configuration: configuration, primaryAction: UIAction { _ in action() })
        button.heightAnchor.constraint(equalToConstant: height).isActive = true
        return button
    }

    /// A text button in the brand blue (Try demo, Cancel).
    static func textButton(_ title: String, color: UIColor = ShellColors.blue700, size: CGFloat = 17, action: @escaping () -> Void) -> UIButton {
        var configuration = UIButton.Configuration.plain()
        configuration.title = title
        configuration.baseForegroundColor = color
        configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var updated = attributes
            updated.font = .systemFont(ofSize: size, weight: .semibold)
            return updated
        }
        let button = UIButton(configuration: configuration, primaryAction: UIAction { _ in action() })
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        return button
    }

    /// A round 44 pt icon button (←, ⋮, ×) with its accessibility label.
    static func iconButton(_ symbol: String, label: String, color: UIColor = ShellColors.slate700, rotated: Bool = false, action: @escaping () -> Void) -> UIButton {
        var configuration = UIButton.Configuration.plain()
        configuration.image = UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold))
        configuration.baseForegroundColor = color
        let button = UIButton(configuration: configuration, primaryAction: UIAction { _ in action() })
        button.accessibilityLabel = label
        if rotated { button.imageView?.transform = CGAffineTransform(rotationAngle: .pi / 2) }
        NSLayoutConstraint.activate([button.widthAnchor.constraint(equalToConstant: 44), button.heightAnchor.constraint(equalToConstant: 44)])
        return button
    }

    /// Pins `content` to `container`'s safe area, centered and at most `columnMaxWidth` wide (iPad: one centered column).
    static func centeredColumn(_ content: UIView, in container: UIView) {
        content.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(content)
        let guide = container.safeAreaLayoutGuide
        let full = content.widthAnchor.constraint(equalTo: guide.widthAnchor)
        full.priority = .defaultHigh
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: guide.topAnchor),
            content.bottomAnchor.constraint(equalTo: guide.bottomAnchor),
            content.centerXAnchor.constraint(equalTo: guide.centerXAnchor),
            content.widthAnchor.constraint(lessThanOrEqualToConstant: columnMaxWidth),
            content.widthAnchor.constraint(lessThanOrEqualTo: guide.widthAnchor),
            full,
        ])
    }
}
