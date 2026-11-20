import AutoByteusMobileCore
import UIKit

/// The app's start screen (autobyteus-279 UIS-001, VIS-001/002/030/032; a port of Android's `StartScreen`): the hero on
/// first launch or "Your nodes", "Other ways to connect" (Type an address, Paste a link), and the bottom bar with Scan and,
/// under it, Try demo. With a back arrow and the open node marked, it is the Switch node list. On iPad it is one centered
/// 448 pt column.
final class StartViewController: UIViewController {
    struct Callbacks {
        let onOpenNode: (SavedNodeEntry) -> Void
        let onMore: (SavedNodeEntry) -> Void
        let onScan: () -> Void
        let onTypeAddress: () -> Void
        let onPasteLink: () -> Void
        let onTryDemo: () -> Void
        /// Switch node only: back to the open page.
        let onBack: () -> Void
    }

    private let entries: [SavedNodeEntry]
    private let currentEntryID: String?
    private let switchMode: Bool
    private let callbacks: Callbacks
    private var rows: [String: NodeRowView] = [:]
    private var otherWaysOpen = false
    private let otherWaysOptions = UIStackView()
    private let otherWaysChevron = ShellUI.symbol("chevron.down", size: 14, color: ShellColors.slate400, weight: .semibold)
    private let otherWaysToggle = UIControl()

    init(entries: [SavedNodeEntry], currentEntryID: String? = nil, switchMode: Bool = false, callbacks: Callbacks) {
        self.entries = entries
        self.currentEntryID = currentEntryID
        self.switchMode = switchMode
        self.callbacks = callbacks
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.white
        view.accessibilityIdentifier = "start.root"

        let column = UIStackView(arrangedSubviews: [header(), ShellUI.divider(), scrollArea(), ShellUI.divider(), footer()])
        column.axis = .vertical
        ShellUI.centeredColumn(column, in: view)
    }

    /// A saved node's state, as the coordinator's checks answer.
    func setReachability(entryID: String, _ state: NodeReachability) {
        rows[entryID]?.setState(state)
    }

    private func header() -> UIView {
        let bar = UIStackView()
        bar.axis = .horizontal
        bar.alignment = .center
        bar.spacing = 10
        bar.isLayoutMarginsRelativeArrangement = true
        bar.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: switchMode ? 8 : 16, bottom: 0, trailing: 16)
        if switchMode {
            bar.addArrangedSubview(ShellUI.iconButton("arrow.left", label: "Back", action: callbacks.onBack))
            bar.addArrangedSubview(ShellUI.label("Switch node", size: 18, weight: .semibold))
        } else {
            let mark = UIImageView(image: UIImage(named: "AutoByteusMark"))
            mark.isAccessibilityElement = false
            mark.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([mark.widthAnchor.constraint(equalToConstant: 28), mark.heightAnchor.constraint(equalToConstant: 28)])
            bar.addArrangedSubview(mark)
            let title = ShellUI.label("AutoByteus", size: 18, weight: .semibold)
            title.accessibilityTraits = .header
            bar.addArrangedSubview(title)
        }
        bar.addArrangedSubview(UIView())
        bar.heightAnchor.constraint(equalToConstant: 56).isActive = true
        return bar
    }

    private func scrollArea() -> UIView {
        let list = UIStackView()
        list.axis = .vertical
        if entries.isEmpty {
            list.addArrangedSubview(hero())
        } else {
            if !switchMode {
                let heading = ShellUI.label("YOUR NODES", size: 12, color: ShellColors.slate500, weight: .semibold)
                let wrapper = UIView()
                heading.translatesAutoresizingMaskIntoConstraints = false
                wrapper.addSubview(heading)
                NSLayoutConstraint.activate([
                    heading.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 16), heading.topAnchor.constraint(equalTo: wrapper.topAnchor, constant: 20),
                    heading.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor, constant: -4),
                ])
                list.addArrangedSubview(wrapper)
            }
            for entry in entries {
                let row = NodeRowView(
                    entry: entry,
                    isCurrent: switchMode && entry.id == currentEntryID,
                    onOpen: { [callbacks] in callbacks.onOpenNode(entry) },
                    onMore: { [callbacks] in callbacks.onMore(entry) }
                )
                rows[entry.id] = row
                list.addArrangedSubview(row)
                list.addArrangedSubview(ShellUI.divider())
            }
        }
        list.addArrangedSubview(otherWays(topMargin: entries.isEmpty ? 40 : 0))

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        list.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(list)
        NSLayoutConstraint.activate([
            list.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            list.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            list.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor),
            list.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor),
        ])
        return scroll
    }

    /// First launch: the QR badge, "Scan the QR code on your computer" and where the desktop shows it (Android's copy:
    /// the desktop's button is "Show QR code", DEC-024).
    private func hero() -> UIView {
        let badge = UIView()
        badge.backgroundColor = ShellColors.blue50
        badge.layer.cornerRadius = 16
        let icon = ShellUI.symbol("qrcode", size: 34, color: ShellColors.blue600)
        icon.translatesAutoresizingMaskIntoConstraints = false
        badge.addSubview(icon)
        badge.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            badge.widthAnchor.constraint(equalToConstant: 72), badge.heightAnchor.constraint(equalToConstant: 72),
            icon.centerXAnchor.constraint(equalTo: badge.centerXAnchor), icon.centerYAnchor.constraint(equalTo: badge.centerYAnchor),
        ])
        let title = ShellUI.label("Scan the QR code on your computer", size: 22, weight: .bold)
        title.textAlignment = .center
        let body = ShellUI.label("On your computer, open Nodes › Phone Setup and press Show QR code.", size: 15, color: ShellColors.slate500)
        body.textAlignment = .center
        let stack = UIStackView(arrangedSubviews: [badge, title, body])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 8
        stack.setCustomSpacing(24, after: badge)
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 80, leading: 32, bottom: 0, trailing: 32)
        stack.accessibilityIdentifier = "start.hero"
        return stack
    }

    private func otherWays(topMargin: CGFloat) -> UIView {
        let title = ShellUI.label("Other ways to connect", size: 15, color: ShellColors.slate600)
        // The title takes the row's width; the chevron keeps its own at the trailing edge.
        title.setContentHuggingPriority(.defaultLow, for: .horizontal)
        otherWaysChevron.setContentHuggingPriority(.required, for: .horizontal)
        let toggleRow = UIStackView(arrangedSubviews: [title, otherWaysChevron])
        toggleRow.axis = .horizontal
        toggleRow.alignment = .center
        toggleRow.isUserInteractionEnabled = false
        toggleRow.translatesAutoresizingMaskIntoConstraints = false
        otherWaysToggle.addSubview(toggleRow)
        NSLayoutConstraint.activate([
            otherWaysToggle.heightAnchor.constraint(equalToConstant: 56),
            toggleRow.leadingAnchor.constraint(equalTo: otherWaysToggle.leadingAnchor, constant: 16),
            toggleRow.trailingAnchor.constraint(equalTo: otherWaysToggle.trailingAnchor, constant: -16),
            toggleRow.centerYAnchor.constraint(equalTo: otherWaysToggle.centerYAnchor),
        ])
        otherWaysToggle.isAccessibilityElement = true
        otherWaysToggle.accessibilityTraits = .button
        otherWaysToggle.accessibilityIdentifier = "start.otherWays"
        otherWaysToggle.addAction(UIAction { [weak self] _ in
            guard let self else { return }
            self.otherWaysOpen.toggle()
            self.applyOtherWays()
        }, for: .touchUpInside)

        otherWaysOptions.axis = .vertical
        otherWaysOptions.addArrangedSubview(ShellUI.divider())
        otherWaysOptions.addArrangedSubview(option(symbol: "link", label: "Type an address", identifier: "start.typeAddress", action: callbacks.onTypeAddress))
        otherWaysOptions.addArrangedSubview(ShellUI.divider())
        otherWaysOptions.addArrangedSubview(option(symbol: "doc.on.clipboard", label: "Paste a link", identifier: "start.pasteLink", action: callbacks.onPasteLink))

        let stack = UIStackView(arrangedSubviews: [otherWaysToggle, otherWaysOptions])
        stack.axis = .vertical
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: topMargin, leading: 0, bottom: 0, trailing: 0)
        applyOtherWays()
        return stack
    }

    private func applyOtherWays() {
        otherWaysOptions.isHidden = !otherWaysOpen
        otherWaysChevron.transform = otherWaysOpen ? CGAffineTransform(rotationAngle: .pi) : .identity
        otherWaysToggle.accessibilityLabel = "Other ways to connect, \(otherWaysOpen ? "expanded" : "collapsed")"
    }

    private func option(symbol: String, label: String, identifier: String, action: @escaping () -> Void) -> UIView {
        let control = UIControl()
        let icon = ShellUI.symbol(symbol, size: 17, color: ShellColors.slate500)
        let text = ShellUI.label(label, size: 15)
        let row = UIStackView(arrangedSubviews: [icon, text])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 12
        row.isUserInteractionEnabled = false
        row.translatesAutoresizingMaskIntoConstraints = false
        control.addSubview(row)
        NSLayoutConstraint.activate([
            control.heightAnchor.constraint(greaterThanOrEqualToConstant: 56),
            icon.widthAnchor.constraint(equalToConstant: 20),
            row.leadingAnchor.constraint(equalTo: control.leadingAnchor, constant: 16),
            row.trailingAnchor.constraint(lessThanOrEqualTo: control.trailingAnchor, constant: -16),
            row.centerYAnchor.constraint(equalTo: control.centerYAnchor),
        ])
        control.isAccessibilityElement = true
        control.accessibilityTraits = .button
        control.accessibilityLabel = label
        control.accessibilityIdentifier = identifier
        control.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return control
    }

    /// The bottom bar: Scan, then (outside Switch node) Try demo under it, in both states (REQ-001).
    private func footer() -> UIView {
        let scan = ShellUI.primaryButton("Scan", symbol: "qrcode", action: callbacks.onScan)
        scan.accessibilityIdentifier = "start.scan"
        let stack = UIStackView(arrangedSubviews: [scan])
        stack.axis = .vertical
        stack.spacing = 4
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 12, leading: 16, bottom: 8, trailing: 16)
        if !switchMode {
            let demo = ShellUI.textButton("Try demo", action: callbacks.onTryDemo)
            demo.accessibilityIdentifier = "start.tryDemo"
            stack.addArrangedSubview(demo)
        }
        return stack
    }
}
