import * as vscode from 'vscode';

export class TerminalManager {
    private terminal: vscode.Terminal | undefined;
    private static readonly TERMINAL_NAME = 'Perch';

    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Opens the Perch terminal on the right side as an editor tab,
     * or focuses it if one already exists.
     */
    openOrFocusTerminal(): void {
        if (this.terminal && this.isTerminalAlive()) {
            this.terminal.show();
            return;
        }
        this.terminal = vscode.window.createTerminal(this.getTerminalOptions());
        // show() is called automatically for editor-location terminals
    }

    /**
     * Builds terminal creation options from user configuration.
     * Uses TerminalEditorLocationOptions to open on the right side,
     * matching a side-panel experience similar to other AI coding extensions.
     */
    getTerminalOptions(): vscode.TerminalOptions {
        const executable = this.getConfigValue<string>('executable', 'agy');
        const defaultArgs = this.getConfigValue<string[]>('defaultArgs', []);
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        return {
            name: TerminalManager.TERMINAL_NAME,
            shellPath: executable,
            shellArgs: defaultArgs.length > 0 ? defaultArgs : undefined,
            cwd: workspaceFolder?.uri,
            iconPath: vscode.Uri.joinPath(this.extensionUri, 'icon.png'),
            // Open as an editor tab on the right side
            location: {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: false,
            },
        };
    }

    /**
     * Kills the existing terminal and launches a fresh one.
     */
    restartTerminal(): void {
        this.stopTerminal();
        // Brief delay to allow the previous terminal to fully close
        setTimeout(() => this.openOrFocusTerminal(), 300);
    }

    /**
     * Disposes the current Perch terminal.
     */
    stopTerminal(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }

    /**
     * Called by the onDidCloseTerminal listener when the terminal is closed externally.
     */
    onTerminalClosed(): void {
        this.terminal = undefined;
    }

    /**
     * Returns true if the given terminal is the managed Perch terminal.
     */
    isPerchTerminal(terminal: vscode.Terminal): boolean {
        return terminal === this.terminal;
    }

    private isTerminalAlive(): boolean {
        if (!this.terminal) {
            return false;
        }
        return vscode.window.terminals.includes(this.terminal);
    }

    /**
     * Reads a setting with automatic backward-compatibility fallback.
     * Checks 'perch.<key>' first; if not explicitly set, falls back to
     * legacy 'antigravity.<key>' if present, otherwise returns defaultValue.
     */
    private getConfigValue<T>(key: string, defaultValue: T): T {
        const perchConfig = vscode.workspace.getConfiguration('perch');
        const legacyConfig = vscode.workspace.getConfiguration('antigravity');

        const perchInspect = perchConfig.inspect<T>(key);
        const hasPerchExplicit = perchInspect && (
            perchInspect.globalValue !== undefined ||
            perchInspect.workspaceValue !== undefined ||
            perchInspect.workspaceFolderValue !== undefined
        );

        if (hasPerchExplicit) {
            return perchConfig.get<T>(key, defaultValue);
        }

        const legacyInspect = legacyConfig.inspect<T>(key);
        const hasLegacyExplicit = legacyInspect && (
            legacyInspect.globalValue !== undefined ||
            legacyInspect.workspaceValue !== undefined ||
            legacyInspect.workspaceFolderValue !== undefined
        );

        if (hasLegacyExplicit) {
            return legacyConfig.get<T>(key, defaultValue);
        }

        return perchConfig.get<T>(key, defaultValue);
    }
}
