/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as base from 'vscode-base-languageclient/lib/base';
import { ReferencesRequest, ReferenceParams, DocumentSymbolRequest, DefinitionRequest, TextDocumentPositionParams } from 'vscode-base-languageclient/lib/protocol';
import { DocumentSymbolParams, SymbolInformation, Location } from 'vscode-languageserver-types';
import { ILanguageClient } from '@theia/languages/lib/browser';

const recordedRequests = new Map<string, Thenable<any>>();

function addRecordedRequest(parameters: any, result: any): void {
    recordedRequests.set(JSON.stringify(parameters), Promise.resolve(result));
}

addRecordedRequest(
    [DefinitionRequest.type, <TextDocumentPositionParams>{
        "position": { "line": 3, "character": 5 },
        "textDocument": { "uri": "file:///zzz.ts" }
    }],
    <Location[]>[
        {
            "uri": "file:///zzz.ts",
            "range": { "start": { "line": 3, "character": 4 }, "end": { "line": 3, "character": 6 } }
        }
    ]
);

addRecordedRequest(
    [DefinitionRequest.type, <TextDocumentPositionParams>{
        "position": { "line": 3, "character": 5 },
        "textDocument": { "uri": "file:///zzz.ts" }
    }],
    <Location[]>[
        {
            "uri": "file:///zzz.ts",
            "range": { "start": { "line": 3, "character": 4 }, "end": { "line": 3, "character": 6 } }
        }
    ]
);

addRecordedRequest(
    [DocumentSymbolRequest.type, <DocumentSymbolParams>{
        "textDocument": { "uri": "file:///zzz.ts" }
    }],
    <SymbolInformation[]>[
        {
            "name": "\"zzz\"",
            "kind": 2,
            "location": { "uri": "file:///zzz.ts", "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 6, "character": 1 } } }
        },
        {
            "name": "Z",
            "kind": 5,
            "location": { "uri": "file:///zzz.ts", "range": { "start": { "line": 1, "character": 0 }, "end": { "line": 6, "character": 1 } } }, "containerName": "\"zzz\""
        },
        {
            "name": "xy",
            "kind": 6,
            "location": { "uri": "file:///zzz.ts", "range": { "start": { "line": 3, "character": 4 }, "end": { "line": 5, "character": 5 } } }, "containerName": "Z"
        }
    ]
);

addRecordedRequest(
    [DocumentSymbolRequest.type, <DocumentSymbolParams>{
        "textDocument": { "uri": "file:///foo.ts" }
    }],
    <SymbolInformation[]>[
        {
            "name": "\"foo\"",
            "kind": 2,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 12, "character": 1 } } }
        },
        {
            "name": "B",
            "kind": 13,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 0, "character": 9 }, "end": { "line": 0, "character": 10 } } }, "containerName": "\"foo\""
        },
        {
            "name": "F",
            "kind": 5,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 3, "character": 0 }, "end": { "line": 12, "character": 1 } } }, "containerName": "\"foo\""
        },
        {
            "name": "foo",
            "kind": 6,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 5, "character": 4 }, "end": { "line": 11, "character": 5 } } }, "containerName": "F"
        },
        {
            "name": "b",
            "kind": 14,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 6, "character": 14 }, "end": { "line": 6, "character": 25 } } }, "containerName": "foo"
        },
        {
            "name": "z",
            "kind": 14,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 8, "character": 14 }, "end": { "line": 8, "character": 25 } } }, "containerName": "foo"
        },
        {
            "name": "Z",
            "kind": 13,
            "location": { "uri": "file:///foo.ts", "range": { "start": { "line": 1, "character": 9 }, "end": { "line": 1, "character": 10 } } }, "containerName": "\"foo\""
        }
    ]
);

addRecordedRequest(
    [DocumentSymbolRequest.type, <DocumentSymbolParams>{
        "textDocument": { "uri": "file:///bar.ts" }
    }],
    <SymbolInformation[]>[
        {
            "name": "\"bar\"",
            "kind": 2,
            "location": { "uri": "file:///bar.ts", "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 8, "character": 1 } } }
        },
        {
            "name": "B",
            "kind": 5,
            "location": { "uri": "file:///bar.ts", "range": { "start": { "line": 2, "character": 0 }, "end": { "line": 8, "character": 1 } } }, "containerName": "\"bar\""
        },
        {
            "name": "bar",
            "kind": 6,
            "location": { "uri": "file:///bar.ts", "range": { "start": { "line": 4, "character": 4 }, "end": { "line": 7, "character": 5 } } }, "containerName": "B"
        },
        {
            "name": "z",
            "kind": 14,
            "location": { "uri": "file:///bar.ts", "range": { "start": { "line": 5, "character": 14 }, "end": { "line": 5, "character": 25 } } }, "containerName": "bar"
        },
        {
            "name": "Z",
            "kind": 13,
            "location": { "uri": "file:///bar.ts", "range": { "start": { "line": 0, "character": 9 }, "end": { "line": 0, "character": 10 } } }, "containerName": "\"bar\""
        }
    ]
);

addRecordedRequest(
    [ReferencesRequest.type, <ReferenceParams>{
        "context": { "includeDeclaration": false },
        "position": { "line": 3, "character": 4 },
        "textDocument": { "uri": "file:///zzz.ts" }
    }],
    <Location[]>[
        {
            "uri": "file:///bar.ts",
            "range": { "start": { "line": 6, "character": 10 }, "end": { "line": 6, "character": 12 } }
        },
        {
            "uri": "file:///foo.ts",
            "range": { "start": { "line": 9, "character": 10 }, "end": { "line": 9, "character": 12 } }
        },
        {
            "uri": "file:///foo.ts",
            "range": {
                "start": { "line": 10, "character": 10 }, "end": { "line": 10, "character": 12 }
            }
        },
        {
            "uri": "file:///zzz.ts",
            "range": { "start": { "line": 3, "character": 4 }, "end": { "line": 3, "character": 6 } }
        }
    ]
);

addRecordedRequest(
    [ReferencesRequest.type, <ReferenceParams>{
        "context": { "includeDeclaration": false },
        "position": { "line": 5, "character": 4 },
        "textDocument": { "uri": "file:///foo.ts" }
    }],
    <Location[]>[
        {
            "uri": "file:///foo.ts",
            "range": { "start": { "line": 5, "character": 4 }, "end": { "line": 5, "character": 7 } }
        }
    ]
);

addRecordedRequest(
    [ReferencesRequest.type, <ReferenceParams>{
        "context": { "includeDeclaration": false },
        "position": { "line": 4, "character": 4 },
        "textDocument": { "uri": "file:///bar.ts" }
    }],
    <Location[]>[
        {
            "uri": "file:///bar.ts",
            "range": { "start": { "line": 4, "character": 4 }, "end": { "line": 4, "character": 7 } }
        },
        {
            "uri": "file:///foo.ts",
            "range": { "start": { "line": 7, "character": 10 }, "end": { "line": 7, "character": 13 } }
        }
    ]
);

const client = new base.BaseLanguageClient({
    clientOptions: {} as any,
    name: 'mock',
    id: 'mock',
    connectionProvider: {} as any,
    services: {} as any
 });

client.sendRequest = function(): Thenable<any> {
    const args: any[] = [];
    // tslint:disable-next-line:forin
    for (const i in arguments) {
        args.push(arguments[i]);
    }
    const result = recordedRequests.get(JSON.stringify(args));
    return result || Promise.reject(undefined);
};

export function getMockedLanguageClient(): ILanguageClient {
    return client;
}
