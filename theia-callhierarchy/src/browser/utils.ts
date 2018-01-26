/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */


import { Location, Range } from 'vscode-languageserver-types';

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

function sameStart(a: Range, b: Range): boolean {
    const pos1 = a.start;
    const pos2 = b.start;
    return pos1.line == pos2.line
        && pos1.character == pos2.character;
}

export function filterSame(locations: Location[], definition: Location): Location[] {
    return locations.filter(candidate => candidate.uri != definition.uri
        || !sameStart(candidate.range, definition.range)
    );
}

export function filterUnique(locations: Location[]): Location[] {
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

