/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';
import { URI } from 'vscode-uri';
import { readFile } from 'fs';
import { resolve, dirname } from 'path';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  let serverModule = context.asAbsolutePath('run-server.js');
  let debugServerModule = context.asAbsolutePath('run-server-debug.js');

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: debugServerModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'rockplate' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient('rockplateLanguageServer', 'Rockplate Language Server', serverOptions, clientOptions);

  client.onReady().then(() => {
    client.onRequest('textDocument/rockplate-schema', ({ uri, path }) => {
      const filePath = resolve(dirname(URI.parse(uri).fsPath), path);
      return new Promise<{ uri: string; text: string }>((resolve, reject) => {
        readFile(filePath, 'utf8', (err, text) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ uri, text });
        });
      });
    });
  });

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
