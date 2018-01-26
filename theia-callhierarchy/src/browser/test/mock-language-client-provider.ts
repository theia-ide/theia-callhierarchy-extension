/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import { ILanguageClient } from '@theia/languages/lib/browser';
import { getMockedLanguageClient } from './mock-language-client';
import { LanguageClientProvider } from '../language-client-provider';

@injectable()
export class MockLanguageClientProvider implements LanguageClientProvider {
    getLanguageClient(languageId: string): Promise<ILanguageClient | undefined> {
        const client: ILanguageClient = getMockedLanguageClient();
        return Promise.resolve(client);
    }
}
