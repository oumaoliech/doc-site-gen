import { 
    Uri, 
    FileType,  
    ExtensionContext, 
    window, 
    workspace
} from 'vscode';
import Processor, { Asciidoctor } from 'asciidoctor';
import * as path from 'path';
import { TextEncoder } from 'util';
import { Configuration } from './config';
import { log, warn } from './output';
import { register } from './kroki';

var fs = workspace.fs;

interface Download {
    description?: string;
    target?: string;
    kbSize?: number;
}

export interface ContentItem {
    caption: string;
    description: string;
    keyWords?: string | string[];
    path?: string;
    icon?: string;
    children?: Contents;
}


type Contents = ContentItem | ContentItem[];

interface Configuration {
    logo?: string;
    title?: string;
    downloads?: Download | Download[];
    contents?: Contents;
}


var docsTitle: string;

export async function clean(): Promise<void> {
    // create or clean output dir
    let outputDirUri = Uri.file(Configuration.docsOutputDir);
    try {
        await fs.stat(outputDirUri);
        log('cleaning directory...');
        await fs.delete(outputDirUri, { recursive: true, useTrash: false });
        await fs.createDirectory(outputDirUri);
        log('cleaned output directory');
    }
    catch(e) {
        log('creating directory...');
        await fs.createDirectory(outputDirUri);
        log('created output directory');
    }
}

export async function generateSite(context: ExtensionContext): Promise<void> {
    await clean();

    log('generating site ...');    

    // load configuration
    let configFileName = 'docsite.config.json';
    let configFilePath = path.resolve(Configuration.docsRootPath, configFileName);
    let configFileBytes = await fs.readFile(Uri.file(configFilePath));
    let config = JSON.parse(configFileBytes.toString());
    
    let convertedConfig = await convertConfig(config);
    docsTitle = <string>convertedConfig.title;

    let convertedConfigJSON = JSON.stringify(convertedConfig, undefined, 2);
    let encoder = new TextEncoder();
    await fs.writeFile(
        Uri.file(path.resolve(Configuration.docsOutputDir, configFileName)), 
        Uint8Array.from(
            encoder.encode(convertedConfigJSON)
        )
    );

    // copy site wrapper to destination
    log('copying site wrapper...');
    await processDirectory(context.asAbsolutePath('site/'), Configuration.docsOutputDir);    
    
    // copy/transform content to destination
    log('generating content ...');
    await processDirectory(Configuration.docsRootPath, Configuration.docsOutputDir);    

    let faviconPath = Uri.file(path.resolve(Configuration.docsOutputDir, 'favicon.ico'));
    await fs.copy(Uri.file(context.asAbsolutePath('icon.ico')), faviconPath, { overwrite: false });

    window.showInformationMessage(`Documentation Site Generated to: ${Configuration.docsOutputDir}`);
}

async function convertConfig(config: Configuration): Promise<Configuration> {
    if (! config.title) {
        throw Error('Invalid Configuration - no title');
    }
    
    if (! config.contents) {
        throw Error('Invalid Configuration - no contents');
    }

    let convertedConfig: Configuration = {
        title: config.title,
        logo: config.logo,
    };

    // downloads
    if (config.downloads) {
        let downloads = config.downloads instanceof Array ? config.downloads : [config.downloads ];
        convertedConfig.downloads = [];
        for (let download of downloads) {
            let validatedDownload = await validateDownload(download);
            if (validatedDownload) {
                convertedConfig.downloads.push(validatedDownload);
            }    
        }
    }

    // contents
    if (config.contents instanceof Array) {
        let contents = convertContents(config.contents);
        if (contents.length === 0) {
            throw Error('Invalid Configuration - no valid contents');
        }

        convertedConfig.contents = contents;
    }
    else {
        try {
            convertedConfig.contents = [ convertContentItem(config.contents) ];
        }
        catch(e) {
            throw Error('Invalid Configuration - no valid contents');
        }
    }

    return convertedConfig;
}

async function validateDownload(download: Download): Promise<Download | null> {
    if (!download.target) {
        warn("Invalid download - 'target' not specified");
        return null;
    }

    let targetPath = path.resolve(Configuration.docsRootPath, download.target);
    try {
        let dlStat = await fs.stat(Uri.file(targetPath));
        return { 
            description: download.description, 
            target: download.target,
            kbSize: Math.round(dlStat.size/1000)
        };
    }
    catch(e) {
        warn(`Invalid download - 'target' invalid. File '${ targetPath }' not found`);
        return null;
    }
}

function convertContentItem(contentItem: ContentItem): ContentItem {
    if (! contentItem.caption) {
        throw new Error('Invalid content item - no caption specified');
    }

    if (! contentItem.path) {
        throw new Error('Invalid content item - no target specified');
    }

    // convert relative .adoc target files to html
    if (! contentItem.path.includes(':') && ! contentItem.path.startsWith('/') && contentItem.path.toLowerCase().endsWith('.adoc')) {
        return { 
            caption: contentItem.caption,
            description: contentItem.description,
            keyWords: contentItem.keyWords,
            path: contentItem.path.slice(0, -5) + '.html',
            icon: contentItem.icon
        };
    }
    else {
        return contentItem;
    }
}

function convertContents(contents: ContentItem[]): ContentItem[] {
    let rContents: ContentItem[] = [];
    for (let content of contents) {
        try {
            let converted = convertContentItem(content);
            if (content.children instanceof Array) {
                let children = convertContents(content.children);
                if (children.length > 0) {
                    converted.children = children;
                }
            }
            else if (content.children) {
                try {
                    converted.children = [ convertContentItem(content.children) ];
                }
                catch(e) {
                    warn((<Error>e).message);
                }
            }

            rContents.push(converted);
        }
        catch(e) {
            warn((<Error>e).message);
        }
    }

    return rContents;
}

var adocProcessor: Asciidoctor;
var registry: Asciidoctor.Extensions.Registry;


async function getProcessor(): Promise<Asciidoctor> {
    if (! adocProcessor) {
        adocProcessor = Processor();
        registry = adocProcessor.Extensions.create();
        await register(registry);
    }

    return adocProcessor;
}



async function processDirectory(dirPath: string, destination: string) {
    // create destination dir
    await fs.createDirectory(Uri.file(destination));

    let dirUri = Uri.file(dirPath);
    let pathInfos = await workspace.fs.readDirectory(dirUri);
    for (let pathInfo of pathInfos) {
        let pathName = pathInfo[0];
        if (pathInfo[1] === FileType.Directory) {
            await processDirectory(path.resolve(dirUri.fsPath, pathName), destination + "/" + pathName);
        }
        else if (pathInfo[1] === FileType.File) {
            log('file: ' + pathName);
            if (pathInfo[0].toLocaleLowerCase().endsWith('.adoc')) {
                // convert adoc to html
                let processor =  await getProcessor();
                let fileBytes = await fs.readFile(Uri.file(path.resolve(dirUri.fsPath, pathName)));
                
                let html = processor.convert(
                    //path.resolve(dirUri.fsPath, pathName),
                    fileBytes.toString(), 
                    { 
                        safe: 'safe', 
                        extension_registry: registry
                    }
                );
                let encoder = new TextEncoder();
                await fs.writeFile(
                    Uri.file(path.resolve(destination, pathName.slice(0, -5) + '.html')), 
                    Uint8Array.from(
                        encoder.encode(<string>html)
                    )
                );
            }
            else if (pathName !== 'docsite.config.json') { 
                if (pathName === 'index.html') {
                    let fileBytes = await fs.readFile(Uri.file(path.resolve(dirUri.fsPath, pathName)));
                    // set title in index.html
                    let updatedContent = fileBytes.toString().replace('{{title}}', docsTitle);
                    let encoder = new TextEncoder();
                    await fs.writeFile(
                        Uri.file(path.resolve(destination, pathName)), 
                        Uint8Array.from(
                            encoder.encode(updatedContent)
                        )
                    );
                }
                else {
                    // copy to destination
                    fs.copy(Uri.file(path.resolve(dirUri.fsPath, pathName)), Uri.file(path.resolve(destination, pathName)), { overwrite: true });
                }
            }
        }
    }
}