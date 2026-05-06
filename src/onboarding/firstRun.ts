import * as vscode from 'vscode'

const STATE_KEY = 'dumb-formatter.onboarded'

export async function runFirstRunPromptIfNeeded(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(STATE_KEY)) return

  const choice = await vscode.window.showInformationMessage(
    'Dumb Formatter is installed. Open the walkthrough to choose which automatic features to enable?',
    'Open walkthrough',
    'Maybe later',
    "Don't ask again",
  )

  if (choice === 'Open walkthrough') {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'SamMcLeod.dumb-formatter#dumb-formatter.gettingStarted', false)
    await context.globalState.update(STATE_KEY, true)
  } else if (choice === "Don't ask again") {
    await context.globalState.update(STATE_KEY, true)
  }
}
