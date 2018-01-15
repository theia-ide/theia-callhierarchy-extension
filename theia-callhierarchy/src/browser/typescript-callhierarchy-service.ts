/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { ILanguageClient } from '@theia/languages/lib/browser';
import { ReferencesRequest, ReferenceParams, DocumentSymbolRequest, DefinitionRequest, TextDocumentPositionParams } from 'vscode-base-languageclient/lib/protocol';
import { DocumentSymbolParams, TextDocumentIdentifier, SymbolInformation, Location, Position, SymbolKind } from 'vscode-languageserver-types';
import * as utils from './utils';
import { Definition, Caller } from './callhierarchy';
import { CallHierarchyService } from './callhierarchy-service';
import { LanguageClientProvider } from './language-client-provider';


@injectable()
export class TypeScriptCallHierarchyService implements CallHierarchyService {

    languageId: string = 'typescript';
    languageClient: ILanguageClient | undefined;

    constructor(
        @inject(LanguageClientProvider) protected readonly languageClientProvider: LanguageClientProvider,
    ) { }

    protected async getLanguageClient(): Promise<ILanguageClient | undefined> {
        if (!this.languageClient) {
            try {
                this.languageClient = await this.languageClientProvider.getLanguageClient(this.languageId);
            } catch (error) {
                console.log(error);
            }
        }
        return this.languageClient
    }

    /**
     * Returns root definition of caller hierarchy.
     */
    public async getRootDefinition(location: Location): Promise<Definition | undefined> {
        this.languageClient =  await this.getLanguageClient();
        if (!this.languageClient) {
            return;
        }
        const uri = location.uri;
        const { line, character } = location.range.start;
        return this.findRootDefinition(this.languageClient, uri, line, character);
    }

    /**
     * Returns next level of caller definitions.
     */
    public async getCallers(definition: Definition): Promise<Caller[] | undefined> {
        this.languageClient =  await this.getLanguageClient();
        if (!this.languageClient) {
            return;
        }
        const callerReferences = await this.getCallerReferences(this.languageClient, definition.location);
        const allMethodSymbols = await this.getAllMethodSymbols(this.languageClient, callerReferences);
        const callers = this.createCallers(callerReferences, allMethodSymbols);
        return callers;
    }

    /**
     * Returns all method symbols from resources of given refences.
     */
    protected async getAllMethodSymbols(languageClient: ILanguageClient, references: Location[]): Promise<Map<string, SymbolInformation[]>> {
        const uris = Array.from(new Set(references.map(reference => reference.uri)));
        const allSymbols = new Map<string, SymbolInformation[]>();
        for (const uri of uris) {
            const symbols = await this.getMethodSymbols(languageClient, uri);
            allSymbols.set(uri, symbols);
        }
        return allSymbols;
    }

    protected async findRootDefinition(languageClient: ILanguageClient, uri: string, line: number, character: number): Promise<Definition | undefined> {
        let locations: Location | Location[] | null = null;
        try {
            locations = await languageClient.sendRequest(DefinitionRequest.type, <TextDocumentPositionParams>{
                position: Position.create(line, character),
                textDocument: { uri }
            })
            if (!locations) {
                return undefined;
            }
        } catch (error) {
            console.error(`error with definitions request: ${uri}#${line}/${character}`);
        }
        const definitionLocation = Array.isArray(locations) ? locations[0] : locations;
        if (!definitionLocation) {
            return undefined;
        }
        const symbols = await this.getMethodSymbols(languageClient, definitionLocation.uri);
        const definitionSymbol = utils.getEnclosingSymbol(symbols, definitionLocation.range);
        if (!definitionSymbol) {
            return undefined;
        }
        return this.toDefinition(definitionSymbol);
    }

    /**
     * Creates callers for given references and method symbols.
     */
    protected async createCallers(callerReferences: Location[], allSymbols: Map<string, SymbolInformation[]>): Promise<Caller[]> {
        const result: Caller[] = [];
        const caller2references = new Map<SymbolInformation, Location[]>();
        for (const reference of callerReferences) {
            const symbols = allSymbols.get(reference.uri);
            if (!symbols) {
                continue;
            }
            const callerSymbol = utils.getEnclosingSymbol(symbols, reference.range);
            if (callerSymbol) {
                const references = caller2references.get(callerSymbol);
                if (references) {
                    references.push(reference);
                } else {
                    caller2references.set(callerSymbol, [reference]);
                }
            }
        }
        caller2references.forEach((references: Location[], callerSymbol: SymbolInformation) => {
            const definition = this.toDefinition(callerSymbol);
            const caller = this.toCaller(definition, references);
            result.push(caller);
        });
        return result;
    }

    protected toCaller(callerDefinition: Definition, references: Location[]): Caller {
        return <Caller>{ callerDefinition, references };
    }

    protected toDefinition(symbol: SymbolInformation): Definition {
        const location = symbol.location;
        const symbolName = symbol.name;
        const containerName = symbol.containerName;
        return <Definition>{ location, symbolName, containerName };
    }

    protected async getMethodSymbols(client: ILanguageClient, uri: string): Promise<SymbolInformation[]> {
        const symbols = await client.sendRequest(DocumentSymbolRequest.type, <DocumentSymbolParams>{
            textDocument: TextDocumentIdentifier.create(uri)
        });
        return symbols.filter(info => info.kind == SymbolKind.Method);
    }

    protected async getCallerReferences(client: ILanguageClient, definition: Location): Promise<Location[]> {
        try {
            const references = await client.sendRequest(ReferencesRequest.type, <ReferenceParams>{
                context: {
                    includeDeclaration: false // TODO find out, why definitions are still contained
                },
                position: {
                    line: definition.range.start.line,
                    character: definition.range.start.character
                },
                textDocument: {
                    uri: definition.uri
                }
            });
            const uniqueReferences = this.filterUnique(references);
            const filteredReferences = this.filterSame(uniqueReferences, definition);
            return filteredReferences;
        } catch (error) {
            console.log(error);
            return []
        }
    }

    protected filterSame(locations: Location[], definition: Location): Location[] {
        return locations.filter(candidate => candidate.uri != definition.uri
            || !utils.matchingStarts(candidate.range, definition.range)
        );
    }

    protected filterUnique(locations: Location[]): Location[] {
        const result: Location[] = [];
        const set = new Set<string>();
        for (const location of locations) {
            const json = JSON.stringify(location);
            if (!set.has(json)) {
                set.add(json);
                result.push(location);
            }
        }
        return result;
    }

}

