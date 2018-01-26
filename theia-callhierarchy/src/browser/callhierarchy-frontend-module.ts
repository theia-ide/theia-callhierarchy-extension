/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { CallHierarchyContribution } from './callhierarchy-contribution';
import { CommandContribution, MenuContribution, KeybindingContribution, bindContributionProvider } from "@theia/core/lib/common";
import { TypeScriptCallHierarchyService } from "./typescript-callhierarchy-service"
import { CallHierarchyService, CallHierarchyServiceProvider } from "./callhierarchy-service"
import { WidgetFactory } from '@theia/core/lib/browser';
import { CALLHIERARCHY_ID } from './callhierarchy';
import { createHierarchyTreeWidget } from './callhierarchy-tree';
import { ActiveEditorAccess } from './active-editor-access';
import { LanguageClientProvider } from './language-client-provider';
import { LanguageClientProviderImpl } from './language-client-provider-impl';
import { CallHierarchyServiceParams } from './callhierarchy-service-impl';

import { ContainerModule } from "inversify";

import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(ActiveEditorAccess).toSelf().inSingletonScope();
    bind(LanguageClientProviderImpl).toSelf().inSingletonScope();
    bind(LanguageClientProvider).toDynamicValue(ctx => ctx.container.get(LanguageClientProviderImpl)).inSingletonScope();

    bindContributionProvider(bind, CallHierarchyService);
    bind(TypeScriptCallHierarchyService).toSelf().inSingletonScope();
    bind(CallHierarchyService).toDynamicValue(ctx => ctx.container.get(TypeScriptCallHierarchyService)).inSingletonScope();
    bind(CallHierarchyServiceProvider).to(CallHierarchyServiceProvider).inSingletonScope();
    bind(CallHierarchyServiceParams).toSelf().inSingletonScope();

    bind(CallHierarchyContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toDynamicValue(ctx => ctx.container.get(CallHierarchyContribution));
    bind(MenuContribution).toDynamicValue(ctx => ctx.container.get(CallHierarchyContribution));
    bind(KeybindingContribution).toDynamicValue(ctx => ctx.container.get(CallHierarchyContribution));

    bind(WidgetFactory).toDynamicValue(context => ({
        id: CALLHIERARCHY_ID,
        createWidget: () => createHierarchyTreeWidget(context.container)
    }));
});