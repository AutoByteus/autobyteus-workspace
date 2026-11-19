import AutoByteusMobileCore
import UIKit

/// A saved node's reachability on the start screen.
enum NodeReachability: Equatable {
    case checking
    case online
    case notReachable
}

/// One saved node (as Android's `NodeRow`, VIS-002): an avatar with a state dot, the name, Online / Not reachable /
/// Checking…, a check when it is the open node (Switch node), and ⋮.
final class NodeRowView: UIView {
    private let entry: SavedNodeEntry
    private let isCurrent: Bool
    private let dot = UIView()
    private let stateLabel = ShellUI.label("", size: 13, color: ShellColors.slate500, lines: 1)
    private let openArea = UIControl()

    init(entry: SavedNodeEntry, isCurrent: Bool, onOpen: @escaping () -> Void, onMore: @escaping () -> Void) {
        self.entry = entry
        self.isCurrent = isCurrent
        super.init(frame: .zero)
        backgroundColor = isCurrent ? ShellColors.blue50 : ShellColors.white
        accessibilityIdentifier = "start.row"

        let avatar = UIView()
        avatar.backgroundColor = isCurrent ? ShellColors.white : ShellColors.slate100
        avatar.layer.cornerRadius = 20
        let computer = ShellUI.symbol("desktopcomputer", size: 18, color: ShellColors.slate600)
        dot.layer.cornerRadius = 7
        dot.layer.borderWidth = 2
        dot.layer.borderColor = (isCurrent ? ShellColors.blue50 : ShellColors.white).cgColor
        for view in [avatar, computer, dot] { view.translatesAutoresizingMaskIntoConstraints = false }
        avatar.addSubview(computer)
        avatar.addSubview(dot)

        let name = ShellUI.label(entry.displayName, size: 16, weight: .semibold, lines: 1)
        let texts = UIStackView(arrangedSubviews: [name, stateLabel])
        texts.axis = .vertical
        texts.spacing = 2
        texts.isUserInteractionEnabled = false

        let row = UIStackView(arrangedSubviews: [avatar, texts])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 12
        row.isUserInteractionEnabled = false
        if isCurrent { row.addArrangedSubview(ShellUI.symbol("checkmark", size: 18, color: ShellColors.blue600, weight: .semibold)) }

        openArea.addSubview(row)
        openArea.addAction(UIAction { _ in onOpen() }, for: .touchUpInside)
        openArea.isAccessibilityElement = true
        openArea.accessibilityTraits = .button
        openArea.accessibilityIdentifier = "start.row.open"

        let more = ShellUI.iconButton("ellipsis", label: "More for \(entry.displayName)", color: ShellColors.slate400, rotated: true, action: onMore)
        more.accessibilityIdentifier = "start.row.more"

        for view in [row, openArea, more] { view.translatesAutoresizingMaskIntoConstraints = false }
        addSubview(openArea)
        addSubview(more)
        NSLayoutConstraint.activate([
            heightAnchor.constraint(greaterThanOrEqualToConstant: 64),
            avatar.widthAnchor.constraint(equalToConstant: 40), avatar.heightAnchor.constraint(equalToConstant: 40),
            computer.centerXAnchor.constraint(equalTo: avatar.centerXAnchor), computer.centerYAnchor.constraint(equalTo: avatar.centerYAnchor),
            dot.widthAnchor.constraint(equalToConstant: 14), dot.heightAnchor.constraint(equalToConstant: 14),
            dot.trailingAnchor.constraint(equalTo: avatar.trailingAnchor, constant: 2), dot.bottomAnchor.constraint(equalTo: avatar.bottomAnchor, constant: 2),
            openArea.leadingAnchor.constraint(equalTo: leadingAnchor), openArea.topAnchor.constraint(equalTo: topAnchor),
            openArea.bottomAnchor.constraint(equalTo: bottomAnchor), openArea.trailingAnchor.constraint(equalTo: more.leadingAnchor),
            row.leadingAnchor.constraint(equalTo: openArea.leadingAnchor, constant: 16), row.trailingAnchor.constraint(lessThanOrEqualTo: openArea.trailingAnchor),
            row.centerYAnchor.constraint(equalTo: openArea.centerYAnchor),
            row.topAnchor.constraint(greaterThanOrEqualTo: openArea.topAnchor, constant: 12),
            more.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4), more.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        setState(.checking)
    }

    required init?(coder: NSCoder) { nil }

    func setState(_ state: NodeReachability) {
        let (label, dotColor, textColor): (String, UIColor, UIColor) = {
            switch state {
            case .checking: return ("Checking…", ShellColors.slate300, ShellColors.slate500)
            case .online: return ("Online", ShellColors.green500, ShellColors.slate500)
            case .notReachable: return ("Not reachable", ShellColors.amber500, ShellColors.amber700)
            }
        }()
        stateLabel.text = label
        stateLabel.textColor = textColor
        dot.backgroundColor = dotColor
        openArea.accessibilityLabel = [entry.displayName, label, isCurrent ? "current node" : nil].compactMap { $0 }.joined(separator: ", ")
    }
}
