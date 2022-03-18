import { error, warn } from "./output";
import rusha from 'rusha';
import nfs from 'fs';
import https from 'https';
import path from "path";
import { Configuration } from "./config";
import { Uri, workspace } from "vscode";


export async function register(registry) {
    const names = [
        'actdiag',
        'blockdiag',
        'bpmn',
        'bytefield',
        'c4plantuml',
        'ditaa',
        'erd',
        'excalidraw',
        'graphviz',
        'mermaid',
        'nomnoml',
        'nwdiag',
        'packetdiag',
        'pikchr',
        'plantuml',
        'rackdiag',
        'seqdiag',
        'svgbob',
        'umlet',
        'vega',
        'vegalite',
        'wavedrom',
        'structurizr'
    ];
    
    let diagramsDir = path.join(Configuration.docsOutputDir, 'diagrams/');
    try {
        await workspace.fs.stat(Uri.file(diagramsDir));
    }
    catch(e) {
        await workspace.fs.createDirectory(Uri.file(diagramsDir));
    }
    
    if (typeof registry.register === 'function') {
        registry.register(function () {
            for (const name of names) {
                this.block(name, diagramBlock(diagramsDir));
                // this.blockMacro(diagramBlockMacro(name, context))
            }
        });
    } else if (typeof registry.block === 'function') {
        for (const name of names) {
            registry.block(name, diagramBlock(diagramsDir));
            // registry.blockMacro(diagramBlockMacro(name, context))
        }
    }
}

function diagramBlock(diagramsDir: string) {
    return function () {
        const self = this;
        self.onContext(['listing', 'literal']);
        self.positionalAttributes(['target', 'format']);
        self.process((parent, reader, attrs) => {
          const diagramType = this.name.toString();
          const role = attrs.role;
          const diagramText = reader.$read();
          try {
            return processKroki(this, parent, attrs, diagramType, diagramText, diagramsDir);
          } catch (e) {
            warn(`Skipping ${diagramType} block. ${e.message}`);
            attrs.role = role ? `${role} kroki-error` : 'kroki-error';
            return this.createBlock(parent, attrs['cloaked-context'], diagramText, attrs);
          }
        });
    };
}

const processKroki = (processor, parent, attrs, diagramType, diagramText, diagramDir/*, context, */) => {
    const doc = parent.getDocument();
    
    const blockId = attrs.id;
    const format = attrs.format || doc.getAttribute('kroki-default-format') || 'svg';
    const caption = attrs.caption;
    const title = attrs.title;
    let role = attrs.role;
    if (role) {
      if (format) {
        role = `${role} kroki-format-${format} kroki`;
      } else {
        role = `${role} kroki`;
      }
    } else {
      role = 'kroki';
    }
    const blockAttrs = Object.assign({}, attrs);
    blockAttrs.role = role;
    blockAttrs.format = format;
    delete blockAttrs.title;
    delete blockAttrs.caption;
    delete blockAttrs.opts;
  
    if (blockId) {
      blockAttrs.id = blockId;
    }
    
    let block;
    let alt;
    if (attrs.title) {
        alt = attrs.title;
    } else if (attrs.target) {
        alt = attrs.target;
    } else {
        alt = 'Diagram';
    }

    // fetch diagram    
    let serverUrl = Configuration.krokiServerUrl;
    const diagramName = `diag-${rusha.createHash().update(diagramType + attrs.target).digest('hex')}.${format}`;
    let imageOutPath = path.join(diagramDir, diagramName);
    const diagramStream = nfs.createWriteStream(imageOutPath);

    fetchDiagram(
        serverUrl, 
        `/${diagramType}`, ///${format}        
        diagramText, 
        diagramStream
    );

    blockAttrs.target = diagramName;
    blockAttrs.alt = alt;
    block = processor.createImageBlock(parent, blockAttrs);

    if (title) {
      block['$title='](title);
    }
    block.$assign_caption(caption, 'figure');
    return block;
};


export function fetchDiagram(
    host: string, 
    path: string, 
    requestData: any, 
    destination: NodeJS.WritableStream, 
    opts?: { end?: boolean; },
    onClose?: () => void) 
{
    const options = {
        host: host,
        port: 443,
        path: path,
        method: 'POST',
        headers: {        
            'Accept': 'image/svg+xml', 
            'Content-Type': 'text/plain'
        }
    };

    const request = https.request(options, (res) => {
        if (res.statusCode !== 200 && res.statusCode !== 201) {
            error(`Fetch Diagram Failed: ${res.statusCode}`);
            res.resume();
            return;
        }
        
        res.pipe(destination, opts);
        destination.on('finish', function() {
            if (onClose) {
                onClose();
            }
        });
    
        res.on('close', () => {
            if (onClose) {
                onClose();
            }
        });
    }).on('error', (e) => {
        error(e.message);
        if (e.stack) {
            error(e.stack);
        }
    });
    request.write(requestData);
    request.end();
}