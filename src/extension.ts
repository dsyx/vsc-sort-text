import * as vscode from "vscode";

/**
 * Sorts user input according to the specified sorter.
 * The logic for obtaining user input is as follows:
 *   - Single cursor:
 *     - When no text is selected or when a single line of text is selected, nothing happens
 *     - When multiline text are selected, get the text in line units
 *   - Multiple cursors:
 *     - When no text is selected, get the text on the line where the cursor is located
 *     - When text is selected, get the text on the selection
 * @param {function} sorter - A function used to sort text. It gets some text, sorts it and outputs it.
 *                            Note: The return value of this function should be the same length as its argument.
 */
async function sortUserInput(sorter: (x: Array<string>) => Array<string>) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const document = editor.document;
	const selections = [...editor.selections].sort((a, b) => {
		if (a.active.isBefore(b.active)) { return -1; }
		if (a.active.isAfter(b.active)) { return 1; }
		return 0;
	});

	const inputs: Array<string> = [];
	const inputRanges: Array<vscode.Range> = [];
	if (selections.length < 2) {
		const selection = editor.selection;
		if (selection.isSingleLine) {
			return;
		}

		for (let i = selection.start.line; i <= selection.end.line; i++) {
			const line = document.lineAt(i);
			inputs.push(line.text);
			inputRanges.push(line.range);
		}
	} else {
		for (let i = 0; i < selections.length; i++) {
			const selection = selections[i];
			if (selection.isEmpty) {
				const line = document.lineAt(selection.active);
				inputs.push(line.text);
				inputRanges.push(line.range);
			} else {
				inputs.push(document.getText(selection));
				inputRanges.push(selection);
			}
		}
	}
	if (inputRanges.length !== inputs.length) {
		return;
	}

	const outputs = sorter(inputs);
	if (outputs.length !== inputs.length) {
		return;
	}

	const uri = document.uri;
	const edit = new vscode.WorkspaceEdit();
	const newSelections: vscode.Selection[] = [];
	for (let i = 0; i < outputs.length; i++) {
		const inputRange = inputRanges[i];
		const output = outputs[i];
		edit.replace(uri, inputRange, output);
		newSelections.push(new vscode.Selection(inputRange.start, inputRange.start.translate(0, output.length)));
	}
	await vscode.workspace.applyEdit(edit);
	editor.selections = newSelections;
}

function ascending(x: Array<string>): Array<string> {
	return x.sort((a, b) => {
		if (a > b) { return 1; }
		if (a < b) { return -1; }
		return 0;
	});
}

function descending(x: Array<string>): Array<string> {
	return x.sort((a, b) => {
		if (a > b) { return -1; }
		if (a < b) { return 1; }
		return 0;
	});
}

export function activate(context: vscode.ExtensionContext) {
	const disposables: Array<vscode.Disposable> = [];

	const commands = [
		{ name: "vsc-sort-text.ascending", callback: () => sortUserInput(ascending) },
		{ name: "vsc-sort-text.descending", callback: () => sortUserInput(descending) }
	];
	commands.forEach(command => {
		disposables.push(vscode.commands.registerCommand(command.name, command.callback));
	});

	context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() { }
