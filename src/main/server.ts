import { workspace, ExtensionContext, window } from 'vscode';
import express, { Request, Response } from 'express';
import path from 'path';
import { generateSite } from './genetator';
import { Server } from 'http';
import { Configuration } from './config';
import { log } from './output';

const app = express();
var port = 9000;
var server: Server;

export async function serve(context: ExtensionContext): Promise<void> {
    let siteAbsoluteDirectory = path.join(Configuration.docsOutputDir);

    await generateSite(context);
    
    if (server) {
        server.close();
    }
    else {
        app.use((request: Request, response: Response, next: (p: any) => any) => {
            const { httpVersion, method, path } = request;
            log(`HTTP/${httpVersion} ${method} ${path} ${request.get('user-agent')}`); // or console.log(routePath);
            next(undefined);
        });
        app.use(express.static(siteAbsoluteDirectory));
        app.all('*', function(req, res){
            log(`ERROR  404: ${req.path} Not Found`);
            res.status(404).send('Requested resourse not found');
        });
    }

    let serve = () => {
        server = app.listen(port, () => {
            log(`Serving '${siteAbsoluteDirectory}' at localhost:${port}`);
        });
    };

    serve();
    server.on('error', (e: NodeJS.ErrnoException) => {
        if (e.code === 'EADDRINUSE') {
          setTimeout(() => {
            server.close();
            port++;
            serve();
          }, 1000);
        }
    });
}

class NotFound extends Error {
    constructor() {
        super('404: Not Found');
        this.name = "NotFound";
        Error.captureStackTrace(this);
    }
}

export function stopServer() {
    if (server) {
        server.close();
        log(`Server stopped`);
    }
}