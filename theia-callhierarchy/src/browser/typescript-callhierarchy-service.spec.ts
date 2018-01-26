/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Container } from 'inversify';
import { expect } from 'chai';
import { TypeScriptCallHierarchyService } from './typescript-callhierarchy-service';
import { CallHierarchyService } from './callhierarchy-service';
import { MockLanguageClientProvider } from './test';
import { LanguageClientProvider } from './language-client-provider';
import { Location, Range } from 'vscode-languageserver-types';

let testContainer: Container;

before(async () => {
    testContainer = new Container();
    testContainer.bind(LanguageClientProvider).to(MockLanguageClientProvider).inSingletonScope();
    testContainer.bind(CallHierarchyService).to(TypeScriptCallHierarchyService).inSingletonScope();
});

let callHierarchyService: TypeScriptCallHierarchyService;

describe('TypeScript call hierarchy service', () => {
    before(() => {
        callHierarchyService = testContainer.get(CallHierarchyService);
    });

    it('Should return root definition for given cursor position.', async () => {
        const cursorPosition = {line: 3, character: 5};
        const root = await callHierarchyService.getRootDefinition(<Location>{ uri: 'file:///zzz.ts', range: Range.create(cursorPosition, cursorPosition) });
        expect(root).to.not.be.equal(undefined);
        if (!root) {
            return;
        }
        expect(root.containerName).to.be.equal('Z');
        expect(root.symbolName).to.be.equal('xy');
    });

    it('Should return callers of root definition.', async () => {
        const cursorPosition = {line: 3, character: 5};
        const root = await callHierarchyService.getRootDefinition(<Location>{ uri: 'file:///zzz.ts', range: Range.create(cursorPosition, cursorPosition) });
        expect(root).to.not.be.equal(undefined);
        if (!root) {
            return;
        }
        const callers = await callHierarchyService.getCallers(root);
        expect(callers).to.not.be.equal(undefined);
        if (!callers) {
            return;
        }
        expect(callers.length).to.be.equal(2);
        expect(callers[0].callerDefinition.symbolName).to.be.equal('bar');
        expect(callers[0].references.length).to.be.equal(1);
        expect(callers[0].references[0].uri).to.be.equal('file:///bar.ts');
        expect(callers[1].callerDefinition.symbolName).to.be.equal('foo');
        expect(callers[1].references.length).to.be.equal(2);
        expect(callers[1].references[0].uri).to.be.equal('file:///foo.ts');
        expect(callers[1].references[0].uri).to.be.equal('file:///foo.ts');
    });
});

/* foo.ts
import { B } from './bar'
import { Z } from './zzz'

export class F {

    foo() {
        const b = new B();
        b.bar();
        const z = new Z();
        z.xy();
        z.xy();
    }
}
*/

/* bar.ts
import { Z } from './zzz'

export class B {

    bar() {
        const z = new Z();
        z.xy();
    }
}
*/

/* zzz.ts

export class Z {

    xy() {

    }
}
*/
