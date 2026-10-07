import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem!: vscode.StatusBarItem;

    /**
     * Creates the status bar item and adds it to subscriptions so it is
     * disposed when the extension deactivates.
     */
    initialize(context: vscode.ExtensionContext): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'antigravity.openTerminal';
        this.setIdle();
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
    }

    /** Shows a spinning icon while Perch is running. */
    setRunning(): void {
        this.statusBarItem.text = '$(sync~spin) Perch';
        this.statusBarItem.tooltip =
            'Perch is running — click to focus terminal';
    }

    /** Shows the default idle state. */
    setIdle(): void {
        this.statusBarItem.text = '$(terminal) Perch';
        this.statusBarItem.tooltip =
            'Click to open Perch terminal  |  ⌘⇧A';
    }
}
