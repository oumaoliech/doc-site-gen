import * as vscode from 'vscode';
import { clean, generateSite } from './main/genetator';
import { serve, stopServer } from './main/server';

// on ativate
export function activate(context: vscode.ExtensionContext) {
	// register docSiteGen.clean
	let disposable = vscode.commands.registerCommand('docSiteGen.clean', () => {
		clean().catch(e => {
			vscode.window.showErrorMessage((<Error>e).message);
		});
	});

	context.subscriptions.push(disposable);

	// register docSiteGen.generateSite
	let disposable2 = vscode.commands.registerCommand('docSiteGen.generateSite', () => {
		generateSite(context).catch(e => {
			vscode.window.showErrorMessage((<Error>e).message);
		});
	});

	context.subscriptions.push(disposable2);

	// register docSiteGen.serve	    
	let disposable3 = vscode.commands.registerCommand('docSiteGen.serve', () => {
		serve(context);
	});

	context.subscriptions.push(disposable3);	

	// register docSiteGen.stopServer
	let disposable4 = vscode.commands.registerCommand('docSiteGen.stopServer', () => {
		stopServer();
	});

	context.subscriptions.push(disposable4);
}

// on deactivate
export function deactivate() {}
