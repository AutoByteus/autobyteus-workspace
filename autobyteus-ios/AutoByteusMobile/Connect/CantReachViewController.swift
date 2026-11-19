import AutoByteusMobileCore
import UIKit

/// "Can't reach <node>" (autobyteus-279 REQ-001; a port of Android's `CantReachScreen`): the plain reason, "Open
/// Tailscale" when the reason names it, Retry when retrying can help, Scan again, and ← back to the node list.
final class CantReachViewController: UIViewController {
    struct Actions {
        let onBack: () -> Void
        let onRetry: () -> Void
        let onScanAgain: () -> Void
        let onOpenTailscale: () -> Void
    }

    private let nodeName: String
    private let reason: CantReachReason
    private let actions: Actions

    init(nodeName: String, reason: CantReachReason, actions: Actions) {
        self.nodeName = nodeName
        self.reason = reason
        self.actions = actions
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.white
        view.accessibilityIdentifier = "cantReach.root"

        let back = ShellUI.iconButton("arrow.left", label: "Back to nodes", action: actions.onBack)
        back.accessibilityIdentifier = "cantReach.back"
        let header = UIStackView(arrangedSubviews: [back, UIView()])
        header.isLayoutMarginsRelativeArrangement = true
        header.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 16)
        header.heightAnchor.constraint(equalToConstant: 56).isActive = true

        let badge = UIView()
        badge.backgroundColor = UIColor(hex: 0xFFFBEB)
        badge.layer.cornerRadius = 16
        let warning = ShellUI.symbol("exclamationmark.triangle.fill", size: 24, color: UIColor(hex: 0xD97706))
        for view in [badge, warning] { view.translatesAutoresizingMaskIntoConstraints = false }
        badge.addSubview(warning)
        NSLayoutConstraint.activate([
            badge.widthAnchor.constraint(equalToConstant: 56), badge.heightAnchor.constraint(equalToConstant: 56),
            warning.centerXAnchor.constraint(equalTo: badge.centerXAnchor), warning.centerYAnchor.constraint(equalTo: badge.centerYAnchor),
        ])
        let title = ShellUI.label(nodeName.isEmpty ? "Can’t connect" : "Can’t reach \(nodeName)", size: 20, weight: .bold)
        title.textAlignment = .center
        title.accessibilityIdentifier = "cantReach.title"
        let body = ShellUI.label(reason.text(nodeName: nodeName), size: 15, color: ShellColors.slate600)
        body.textAlignment = .center
        body.accessibilityIdentifier = "cantReach.body"
        let middle = UIStackView(arrangedSubviews: [badge, title, body])
        middle.axis = .vertical
        middle.alignment = .center
        middle.spacing = 8
        middle.setCustomSpacing(20, after: badge)
        if reason.offersTailscale {
            let link = ShellUI.textButton("Open Tailscale", size: 15, action: actions.onOpenTailscale)
            link.accessibilityIdentifier = "cantReach.tailscale"
            middle.setCustomSpacing(16, after: body)
            middle.addArrangedSubview(link)
        }
        middle.isLayoutMarginsRelativeArrangement = true
        middle.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 32, bottom: 40, trailing: 32)
        let middleWrapper = UIView()
        middle.translatesAutoresizingMaskIntoConstraints = false
        middleWrapper.addSubview(middle)
        NSLayoutConstraint.activate([
            middle.centerYAnchor.constraint(equalTo: middleWrapper.centerYAnchor),
            middle.leadingAnchor.constraint(equalTo: middleWrapper.leadingAnchor),
            middle.trailingAnchor.constraint(equalTo: middleWrapper.trailingAnchor),
        ])

        let footer = UIStackView()
        footer.axis = .vertical
        footer.spacing = 8
        footer.isLayoutMarginsRelativeArrangement = true
        footer.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 12, leading: 16, bottom: 16, trailing: 16)
        if reason.canRetry {
            let retry = ShellUI.primaryButton("Retry", action: actions.onRetry)
            retry.accessibilityIdentifier = "cantReach.retry"
            footer.addArrangedSubview(retry)
        }
        var scanConfiguration = UIButton.Configuration.bordered()
        scanConfiguration.title = "Scan again"
        scanConfiguration.baseForegroundColor = ShellColors.slate700
        scanConfiguration.baseBackgroundColor = ShellColors.white
        scanConfiguration.background.strokeColor = ShellColors.slate300
        scanConfiguration.background.strokeWidth = 1
        scanConfiguration.background.cornerRadius = 16
        let scan = UIButton(configuration: scanConfiguration, primaryAction: UIAction { [actions] _ in actions.onScanAgain() })
        scan.heightAnchor.constraint(equalToConstant: 56).isActive = true
        scan.accessibilityIdentifier = "cantReach.scanAgain"
        footer.addArrangedSubview(scan)

        let column = UIStackView(arrangedSubviews: [header, middleWrapper, footer])
        column.axis = .vertical
        ShellUI.centeredColumn(column, in: view)
        UIAccessibility.post(notification: .screenChanged, argument: title)
    }
}
