/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */


import { Range } from 'vscode-languageserver-types';
import { SymbolInformation } from '@theia/languages/lib/browser';

/**
 * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
 */
export function containsRange(range: Range, otherRange: Range): boolean {
    if (otherRange.start.line < range.start.line || otherRange.end.line < range.start.line) {
        return false;
    }
    if (otherRange.start.line > range.end.line || otherRange.end.line > range.end.line) {
        return false;
    }
    if (otherRange.start.line === range.start.line && otherRange.start.character < range.start.character) {
        return false;
    }
    if (otherRange.end.line === range.end.line && otherRange.end.character > range.end.character) {
        return false;
    }
    return true;
}

/**
 * A function that compares ranges, useful for sorting ranges
 * It will first compare ranges on the startPosition and then on the endPosition
 */
export function compareRangesUsingStarts(a: Range, b: Range): number {
    let aStartLine = a.start.line | 0;
    let bStartLine = b.start.line | 0;

    if (aStartLine === bStartLine) {
        let aStartColumn = a.start.character | 0;
        let bStartColumn = b.start.character | 0;

        if (aStartColumn === bStartColumn) {
            let aendline = a.end.line | 0;
            let bendline = b.end.line | 0;

            if (aendline === bendline) {
                let aEndColumn = a.end.character | 0;
                let bEndColumn = b.end.character | 0;
                return aEndColumn - bEndColumn;
            }
            return aendline - bendline;
        }
        return aStartColumn - bStartColumn;
    }
    return aStartLine - bStartLine;
}

export function matchingStarts(a: Range, b: Range): boolean {
    const pos1 = a.start;
    const pos2 = b.start;
    return pos1.line == pos2.line
        && pos1.character == pos2.character;
}

export function getEnclosingSymbol(symbols: SymbolInformation[], range: Range): SymbolInformation | undefined {
    const enclosingSymbols = symbols.filter(symbol => containsRange(symbol.location.range, range));
    if (enclosingSymbols.length == 1) {
        return enclosingSymbols[0];
    }
    const sortedEnclosingSymbols = enclosingSymbols.sort((a, b) => {
        return compareRangesUsingStarts(a.location.range, b.location.range);
    });
    return sortedEnclosingSymbols[0];
}
