import * as vscode from 'vscode';
import { TerminalManager } from './terminalManager';
import { StatusBarManager } from './statusBarManager';
import { WelcomeViewProvider } from './welcomeViewProvider';

const NEW_ID = 'nuwanthapasindu.perch-for-agy';
const OLD_ID = 'nuwanthapasindu.antigravity-cli';
const HIDE_KEY = 'perchMoveNoticeHidden';

export function activate(context: vscode.ExtensionContext): void {
    // If Perch is installed, forward the legacy commands to it and stop.
    // The old keybinding and editor-title button then still work.
    if (vscode.extensions.getExtension(NEW_ID)) {
        for (const cmd of ['openTerminal', 'restartTerminal', 'stopTerminal']) {
            context.subscriptions.push(
                vscode.commands.registerCommand(`antigravity.${cmd}`,
                    () => vscode.commands.executeCommand(`perch.${cmd}`))
            );
        }
        return;
    }

    const version = context.extension.packageJSON.version;
    const description = context.extension.packageJSON.description;

    const terminalManager = new TerminalManager(context.extensionUri);
    const statusBarManager = new StatusBarManager();
    const welcomeViewProvider = new WelcomeViewProvider(context.extensionUri, version, description);

    // ── Commands ─────────────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.openTerminal', () => {
            terminalManager.openOrFocusTerminal();
            statusBarManager.setRunning();
        }),

        vscode.commands.registerCommand('antigravity.restartTerminal', () => {
            terminalManager.restartTerminal();
            statusBarManager.setRunning();
        }),

        vscode.commands.registerCommand('antigravity.stopTerminal', () => {
            terminalManager.stopTerminal();
            statusBarManager.setIdle();
        })
    );

    // ── Sidebar webview ───────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'antigravity.welcomeView',
            welcomeViewProvider
        )
    );

    // ── Terminal profile provider ─────────────────────────────────────────────
    context.subscriptions.push(
        vscode.window.registerTerminalProfileProvider(
            'antigravity.terminalProfile',
            {
                provideTerminalProfile(): vscode.TerminalProfile {
                    return new vscode.TerminalProfile(
                        terminalManager.getTerminalOptions()
                    );
                }
            }
        )
    );

    // ── Terminal lifecycle tracking ───────────────────────────────────────────
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((terminal) => {
            if (terminalManager.isPerchTerminal(terminal)) {
                terminalManager.onTerminalClosed();
                statusBarManager.setIdle();
            }
        })
    );

    // ── Status bar ────────────────────────────────────────────────────────────
    statusBarManager.initialize(context);

    void showMoveNotice(context);
}

async function showMoveNotice(context: vscode.ExtensionContext): Promise<void> {
    if (context.globalState.get<boolean>(HIDE_KEY)) {
        return;
    }

    const pick = await vscode.window.showInformationMessage(
        'This extension has moved. Perch for Google Antigravity CLI now has a new Marketplace listing. ' +
        'Install it to keep getting updates. Your settings will carry over.',
        'Install Perch', 'Later', "Don't show again"
    );

    if (pick === "Don't show again") {
        await context.globalState.update(HIDE_KEY, true);
        return;
    }
    if (pick !== 'Install Perch') {
        return;
    }

    await vscode.commands.executeCommand('workbench.extensions.installExtension', NEW_ID);

    const next = await vscode.window.showInformationMessage(
        'Perch is installed. Remove this old extension now?', 'Remove old', 'Keep');
    if (next === 'Remove old') {
        await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', OLD_ID);
        const r = await vscode.window.showInformationMessage('Reload to finish.', 'Reload');
        if (r === 'Reload') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}

export function deactivate(): void {
    // VS Code handles subscription cleanup via context.subscriptions
}
