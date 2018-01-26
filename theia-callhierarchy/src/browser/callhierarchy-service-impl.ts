/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { ILanguageClient } from '@theia/languages/lib/browser';
import { ReferencesRequest, ReferenceParams, DocumentSymbolRequest, DefinitionRequest, TextDocumentPositionParams } from 'vscode-base-languageclient/lib/protocol';
import { DocumentSymbolParams, TextDocumentIdentifier, SymbolInformation, Location, Position, Range, SymbolKind } from 'vscode-languageserver-types';
import * as utils from './utils';
import { Definition, Caller } from './callhierarchy';
import { CallHierarchyService } from './callhierarchy-service';
import { LanguageClientProvider } from './language-client-provider';
import { ILogger } from "@theia/core";

@injectable()
export abstract class CallHierarchyServiceImpl implements CallHierarchyService {

    languageClient: ILanguageClient | undefined;

    @inject(LanguageClientProvider) readonly languageClientProvider: LanguageClientProvider;
    @inject(ILogger) readonly logger: ILogger;

    abstract get languageId(): string;

    /**
     * Override this to configure the callables of your language.
     */
    protected isCallable(symbolKind: SymbolKind): boolean {
        switch (symbolKind) {
            case SymbolKind.Constant:
            case SymbolKind.Constructor:
            case SymbolKind.Field:
            case SymbolKind.Function:
            case SymbolKind.Method:
            case SymbolKind.Property:
            case SymbolKind.Variable:
                return true;
            default:
                return false;
        }
    }

    /**
     * Returns root definition of caller hierarchy.
     */
    public async getRootDefinition(location: Location): Promise<Definition | undefined> {
        const languageClient = await this.getLanguageClient();
        if (!languageClient) {
            return;
        }
        const uri = location.uri;
        const { line, character } = location.range.start;
        return this.findRootDefinition(languageClient, uri, line, character);
    }

    /**
     * Returns next level of caller definitions.
     */
    public async getCallers(definition: Definition): Promise<Caller[] | undefined> {
        const languageClient = await this.getLanguageClient();
        if (!languageClient) {
            return;
        }
        const callerReferences = await this.getCallerReferences(languageClient, definition.location);
        const allMethodSymbols = await this.getAllCallableSymbols(languageClient, callerReferences);
        const callers = this.createCallers(callerReferences, allMethodSymbols);
        return callers;
    }

    protected async getLanguageClient(): Promise<ILanguageClient | undefined> {
        if (!this.languageClient) {
            try {
                this.languageClient = await this.languageClientProvider.getLanguageClient(this.languageId);
            } catch (error) {
                this.logger.error("Error getting language client", error);
            }
        }
        return this.languageClient;
    }

    protected async findRootDefinition(languageClient: ILanguageClient, uri: string, line: number, character: number): Promise<Definition | undefined> {
        let locations: Location | Location[] | null = null;
        try {
            locations = await languageClient.sendRequest(DefinitionRequest.type, <TextDocumentPositionParams>{
                position: Position.create(line, character),
                textDocument: { uri }
            });
            if (!locations) {
                return undefined;
            }
        } catch (error) {
            this.logger.error(`Error from definitions request: ${uri}#${line}/${character}`, error);
        }
        const definitionLocation = Array.isArray(locations) ? locations[0] : locations;
        if (!definitionLocation) {
            return undefined;
        }
        const symbols = await this.getCallableSymbolsInResource(languageClient, definitionLocation.uri);
        const definitionSymbol = this.getEnclosingSymbol(symbols, definitionLocation.range);
        if (!definitionSymbol) {
            return undefined;
        }
        return this.toDefinition(definitionSymbol);
    }

    protected async getCallableSymbolsInResource(client: ILanguageClient, uri: string): Promise<SymbolInformation[]> {
        const symbols = await client.sendRequest(DocumentSymbolRequest.type, <DocumentSymbolParams>{
            textDocument: TextDocumentIdentifier.create(uri)
        });
        return symbols.filter(info => this.isCallable(info.kind));
    }

    /**
     * Returns all method symbols from resources of given refences.
     */
    protected async getAllCallableSymbols(languageClient: ILanguageClient, references: Location[]): Promise<Map<string, SymbolInformation[]>> {
        const uris = Array.from(new Set(references.map(reference => reference.uri)));
        const allSymbols = new Map<string, SymbolInformation[]>();
        for (const uri of uris) {
            const symbols = await this.getCallableSymbolsInResource(languageClient, uri);
            allSymbols.set(uri, symbols);
        }
        return allSymbols;
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
            const callerSymbol = this.getEnclosingSymbol(symbols, reference.range);
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
            const uniqueReferences = utils.filterUnique(references);
            const filteredReferences = utils.filterSame(uniqueReferences, definition);
            return filteredReferences;
        } catch (error) {
            this.logger.error(`Error from references request`, error);
            return [];
        }
    }

    /**
     * Finds the symbol that encloses the definition range
     */
    protected getEnclosingSymbol(symbols: SymbolInformation[], definition: Range): SymbolInformation | undefined {
        let bestMatch: SymbolInformation | undefined = undefined;
        let bestRange: Range | undefined = undefined;
        for (let candidate of symbols) {
            const candidateRange = candidate.location.range;
            if (utils.containsRange(candidateRange, definition)) {
                if (!bestMatch || this.isBetter(candidateRange, bestRange!)) {
                    bestMatch = candidate;
                    bestRange = candidateRange;
                }
            }
        }
        return bestMatch;
    }

    /**
     * Evaluation function for enclosing regions.
     * As symbols can be nested, we are looking for the one with the smallest region.
     * As we only check regions that contain the definition, that is the one with the
     * latest start position.
     * The TS language server returns two symbols for a method: One spanning the name
     * and one spanning the entire method including the body. We are only interested
     * in the latter. So if two regions start at the same position the longer one wins
     */
    protected isBetter(a: Range, b: Range) {
        if (a.start.line > b.start.line) {
            return true;
        }
        if (a.start.line === b.start.line) {
            if (a.start.character > b.start.character) {
                return true;
            }
            if (a.start.character === b.start.character) {
                if (a.end.line > b.end.line) {
                    return true;
                }
                if (a.end.line === b.end.line) {
                    if (a.end.character > b.end.character) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
