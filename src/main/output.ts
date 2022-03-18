import { OutputChannel, window } from 'vscode';

enum OutputType { Info, Warn, Error }

var outputChannel: OutputChannel;
export function getOutputChannel() {
    if (! outputChannel) {
        outputChannel = window.createOutputChannel("doc-site-gen");        
    }

    return outputChannel;
}

export function log(messge: string): void {
    writeLog(OutputType.Info, messge);
}

export function warn(messge: string): void {
    writeLog(OutputType.Warn, messge);
}

export function error(messge: string): void {
    writeLog(OutputType.Error, messge);
}

function writeLog(type: OutputType, messge: string): void {
    let tag = type === OutputType.Error ? 'ERROR   ' : type === OutputType.Warn ? 'WARN    ' : 'INFO    ';
    let outputChannel = getOutputChannel();
    outputChannel.appendLine(`${tag} ${ messge }`);
    outputChannel.show();
}

