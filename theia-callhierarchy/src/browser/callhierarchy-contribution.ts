/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, Command, MenuContribution, MenuModelRegistry, KeybindingContribution, 
    KeybindingRegistry, CommandHandler, KeyCode, Key, Modifier } from "@theia/core/lib/common";
import { WidgetManager, FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { EDITOR_CONTEXT_MENU } from '@theia/editor/lib/browser';
import { CallHierarchyService } from './callhierarchy-service';
import { CallHierarchyTreeWidget } from './callhierarchy-tree/callhierarchy-tree-widget';
import { MessageService } from "@theia/core/lib/common";
import { CALLHIERARCHY_ID } from './callhierarchy'
import { ActiveEditorAccess } from './active-editor-access';

export namespace CallhierarchyCommands {
    export const OPEN: Command = {
        id: 'callhierarchy:open',
        label: 'Open Call Hierarchy'
    };
}

@injectable()
export class CallHierarchyContribution implements CommandContribution, MenuContribution, KeybindingContribution, FrontendApplicationContribution {

    constructor(
        @inject(FrontendApplication) protected readonly app: FrontendApplication,
        @inject(CallHierarchyService) protected readonly callHierarchyService: CallHierarchyService,
        @inject(MessageService) protected readonly messageService: MessageService,
        @inject(WidgetManager) protected readonly widgetFactory: WidgetManager,
        @inject(ActiveEditorAccess) protected readonly editorAccess: ActiveEditorAccess,
    ) { }

    initializeLayout(app: FrontendApplication) {
        // TODO add status bar item
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(CallhierarchyCommands.OPEN, <CommandHandler> {
            execute: () => this.initCallHierarchyView(),
            isEnabled: () => this.isCallHierarchyAvailable(),
        });
    }

    protected async initCallHierarchyView(): Promise<void> {
        const hierarchyTreeWidget = await this.widgetFactory.getOrCreateWidget<CallHierarchyTreeWidget>(CALLHIERARCHY_ID);
        if (!hierarchyTreeWidget.isAttached) {
            this.app.shell.addToMainArea(hierarchyTreeWidget);
        }
        this.app.shell.activateMain(hierarchyTreeWidget.id);
        // initialize new call hierarchy
        const selection = this.editorAccess.getSelection();
        const languageId = this.editorAccess.getLanguageId();
        hierarchyTreeWidget.model.initializeCallHierarchy(languageId, selection);
    }

    protected isCallHierarchyAvailable(): boolean {
        const selection = this.editorAccess.getSelection();
        const languageId = this.editorAccess.getLanguageId();
        return !!selection && !!languageId;
    }

    registerMenus(menus: MenuModelRegistry): void {
        const menuPath = [...EDITOR_CONTEXT_MENU, 'navigation'];
        menus.registerMenuAction(menuPath, {
            commandId: CallhierarchyCommands.OPEN.id,
            label: CallhierarchyCommands.OPEN.label,
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            commandId: CallhierarchyCommands.OPEN.id,
            keyCode: KeyCode.createKeyCode({
                first: Key.F1,
                modifiers: [ Modifier.M2],
            }),
            accelerator: ['Shift F1'],
        });
    }
}