/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { MenuModelRegistry, Command, CommandRegistry } from "@theia/core/lib/common";
import { FrontendApplication, AbstractViewContribution, OpenViewArguments } from '@theia/core/lib/browser';
import { EDITOR_CONTEXT_MENU } from '@theia/editor/lib/browser';
import { CallHierarchyTreeWidget } from './callhierarchy-tree/callhierarchy-tree-widget';
import { CALLHIERARCHY_ID } from './callhierarchy';
import { ActiveEditorAccess } from './active-editor-access';

export const CALL_HIERARCHY_TOGGLE_COMMAND_ID = 'callhierachy:toggle';
export const CALL_HIERARCHY_LABEL = 'Call hierarchy';

export namespace CallHierarchyCommands {
    export const OPEN: Command = {
        id: 'callhierarchy:open',
        label: 'Open Call Hierarchy'
    };
}

@injectable()
export class CallHierarchyContribution extends  AbstractViewContribution<CallHierarchyTreeWidget> {

    constructor(@inject(ActiveEditorAccess) protected readonly editorAccess: ActiveEditorAccess) {
        super({
            widgetId: CALLHIERARCHY_ID,
            widgetName: CALL_HIERARCHY_LABEL,
            defaultWidgetOptions: {
                area: 'bottom'
            },
            toggleCommandId: CALL_HIERARCHY_TOGGLE_COMMAND_ID,
            toggleKeybinding: 'shift+f1'
        });
    }

    initializeLayout(app: FrontendApplication) {
        // TODO add status bar item
    }

    protected isCallHierarchyAvailable(): boolean {
        const selection = this.editorAccess.getSelection();
        const languageId = this.editorAccess.getLanguageId();
        return !!selection && !!languageId;
    }

    async openView(args?: Partial<OpenViewArguments>): Promise<CallHierarchyTreeWidget> {
        const widget = await super.openView(args);
        const selection = this.editorAccess.getSelection();
        const languageId = this.editorAccess.getLanguageId();
        widget.initializeModel(selection, languageId);
        return widget;
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CallHierarchyCommands.OPEN, {
            execute: () => this.openView({
                toggle: false,
                activate: true
            }),
            isEnabled: this.isCallHierarchyAvailable.bind(this)
        });
        super.registerCommands(commands);
    }

    registerMenus(menus: MenuModelRegistry): void {
        const menuPath = [...EDITOR_CONTEXT_MENU, 'navigation'];
        menus.registerMenuAction(menuPath, {
            commandId: CallHierarchyCommands.OPEN.id,
            label: CALL_HIERARCHY_LABEL
        });
        super.registerMenus(menus);
    }
}
