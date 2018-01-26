/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { LanguageClientProvider } from './language-client-provider';
import { BaseCallHierarchyService } from "./base-callhierarchy-service";

@injectable()
export class TypeScriptCallHierarchyService extends BaseCallHierarchyService {

    readonly languageId: string = 'typescript';

    constructor(@inject(LanguageClientProvider) protected readonly languageClientProvider: LanguageClientProvider) {
        super(languageClientProvider);
    }
}

