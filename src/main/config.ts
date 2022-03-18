import path from "path";
import { workspace } from "vscode";

var workspaceRootPath: string;
var docsRootPath: string;
var docsOutputDir: string;
var krokiServerUrl: string;
var docsTitle: string;

export var Configuration = {    
    get workspaceRootPath() : string {
        if (! workspaceRootPath) {
            if (! workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
                throw new Error('No workspace folder open');
            }
        
            workspaceRootPath = workspace.workspaceFolders[0].uri.fsPath;
        }
        
        return workspaceRootPath;
    },
    get docsRootPath() : string {
        if (! docsRootPath) {
            let docsRootDirCfg = workspace.getConfiguration('docSiteGenerator').get<string>('docsRootDirectory') || '.';
            docsRootPath = path.resolve(this.workspaceRootPath, docsRootDirCfg);
        }

        return docsRootPath;
    },
    get docsOutputDir() : string {
        if (! docsOutputDir) {
            let docsOutputDirCfg = workspace.getConfiguration('docSiteGenerator').get<string>('outputDirectory') || '/build/docsite/';
            docsOutputDir = path.resolve(this.workspaceRootPath, docsOutputDirCfg);
        }
        return docsOutputDir;
    },
    get krokiServerUrl() : string {
        if (! krokiServerUrl) {
            krokiServerUrl = workspace.getConfiguration('docSiteGenerator').get<string>('krokiServerUrl') || 'kroki.io';
        }

        return krokiServerUrl;
    }
};