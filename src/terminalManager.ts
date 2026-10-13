import * as vscode from 'vscode';

/**
 * Reads a setting from 'perch.<key>', falling back to the legacy
 * 'antigravity.<key>' when only the latter is explicitly set. Both default to
 * the same value, so the explicit (user-set) values are compared via inspect().
 */
function getSetting<T>(key: 'executable' | 'defaultArgs', fallback: T): T {
    const pick = <V>(i?: { workspaceFolderValue?: V; workspaceValue?: V; globalValue?: V }) =>
        i?.workspaceFolderValue ?? i?.workspaceValue ?? i?.globalValue;
    const perch = vscode.workspace.getConfiguration('perch').inspect<T>(key);
    const legacy = vscode.workspace.getConfiguration('antigravity').inspect<T>(key);
    return pick(perch) ?? pick(legacy) ?? perch?.defaultValue ?? fallback;
}

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
        const executable = getSetting<string>('executable', 'agy');
        const defaultArgs = getSetting<string[]>('defaultArgs', []);
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
}
