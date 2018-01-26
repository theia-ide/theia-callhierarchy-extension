/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { Message } from "@phosphor/messaging";
import {
    ContextMenuRenderer, TreeWidget, NodeProps, TreeProps, ITreeNode,
    ISelectableTreeNode, ITreeModel, DockPanel
} from "@theia/core/lib/browser";
import { ElementAttrs, h } from "@phosphor/virtualdom";
import { LabelProvider } from "@theia/core/lib/browser/label-provider";
import { DefinitionNode, CallerNode } from "./callhierarchy-tree";
import { CallHierarchyTreeModel } from "./callhierarchy-tree-model";
import { CALLHIERARCHY_ID, Definition, Caller } from "../callhierarchy";
import URI from "@theia/core/lib/common/uri";
import { Location, Range } from 'vscode-languageserver-types';
import { EditorManager } from "@theia/editor/lib/browser";

export const HIERARCHY_TREE_CLASS = 'theia-CallHierarchyTree';
export const DEFINITION_NODE_CLASS = 'theia-CallHierarchyTreeNode';
export const DEFINITION_ICON_CLASS = 'theia-CallHierarchyTreeNodeIcon';

@injectable()
export class CallHierarchyTreeWidget extends TreeWidget {

    constructor(
        @inject(TreeProps) readonly props: TreeProps,
        @inject(CallHierarchyTreeModel) readonly model: CallHierarchyTreeModel,
        @inject(ContextMenuRenderer) contextMenuRenderer: ContextMenuRenderer,
        @inject(LabelProvider) protected readonly labelProvider: LabelProvider,
        @inject(EditorManager) readonly editorManager: EditorManager,
    ) {
        super(props, model, contextMenuRenderer);

        this.id = CALLHIERARCHY_ID;
        this.title.label = 'Call Hierarchy';
        this.title.iconClass = 'fa fa-arrow-circle-down';
        this.title.closable = true;
        this.addClass(HIERARCHY_TREE_CLASS);
        this.model.onSelectionChanged((node: Readonly<ISelectableTreeNode> | undefined) => {
            if (node) {
                this.openEditor(node, true);
            }
        });
        this.model.onOpenNode((node: ITreeNode) => {
                this.openEditor(node, false);
        });
    }

    initializeModel(selection: Location | undefined, languageId: string | undefined): void {
        this.model.initializeCallHierarchy(languageId, selection);
    }

    protected createNodeClassNames(node: ITreeNode, props: NodeProps): string[] {
        const classNames = super.createNodeClassNames(node, props);
        if (DefinitionNode.is(node)) {
            classNames.push(DEFINITION_NODE_CLASS);
        }
        return classNames;
    }

    protected onUpdateRequest(msg: Message) {
        if (!this.model.selectedNode && ISelectableTreeNode.is(this.model.root)) {
            this.model.selectNode(this.model.root);
        }
        super.onUpdateRequest(msg);
    }

    protected createNodeAttributes(node: ITreeNode, props: NodeProps): ElementAttrs {
        const elementAttrs = super.createNodeAttributes(node, props);
        return {
            ...elementAttrs,
        };
    }

    protected renderTree(model: ITreeModel): h.Child {
        return super.renderTree(model)
        || h.div({ className: 'noCallers' }, 'No callers have been detected.');
    }

    protected decorateCaption(node: ITreeNode, caption: h.Child, props: NodeProps): h.Child {
        if (DefinitionNode.is(node)) {
            return super.decorateExpandableCaption(node, this.decorateDefinitionCaption(node.definition, caption), props);
        }
        if (CallerNode.is(node)) {
            return super.decorateExpandableCaption(node, this.decorateCallerCaption(node.caller, caption), props);
        }
        return h.div({}, 'caption');
    }

    protected decorateDefinitionCaption(definition: Definition, caption: h.Child): h.Child {
        const containerName = definition.containerName;
        const icon = h.span({ className: "symbol-icon method" });
        const symbol = definition.symbolName;
        const symbolElement = h.div({ className: 'symbol' }, symbol);
        const location = this.labelProvider.getName(new URI(definition.location.uri));
        const container = (containerName) ? containerName + ' — ' + location : location;
        const containerElement = h.div({ className: 'container' }, container);
        return h.div({ className: 'definitionNode' }, icon, symbolElement, containerElement);
    }

    protected decorateCallerCaption(caller: Caller, caption: h.Child): h.Child {
        const definition = caller.callerDefinition;
        const icon = h.span({ className: "symbol-icon method" });
        const containerName = definition.containerName;
        const symbol = definition.symbolName;
        const symbolElement = h.div({ className: 'symbol' }, symbol);
        const referenceCount = caller.references.length;
        const referenceCountElement = h.div({ className: 'referenceCount' }, (referenceCount > 1) ? `[${referenceCount}]` : '');
        const location = this.labelProvider.getName(new URI(definition.location.uri));
        const container = (containerName) ? containerName + ' — ' + location : location;
        const containerElement = h.div({ className: 'container' }, container);
        return h.div({ className: 'definitionNode' }, icon, symbolElement, referenceCountElement, containerElement);
    }

    private openEditor(node: ITreeNode, keepFocus: boolean) {
        let location: Location | undefined;
        if (DefinitionNode.is(node)) {
            location = node.definition.location;
        }
        if (CallerNode.is(node)) {
            location = node.caller.references[0];
        }
        if (location) {
            this.editorManager.open(
                new URI(location.uri), { 
                    revealIfVisible: !keepFocus,
                    selection: Range.create(location.range.start, location.range.start)
                }
            ).then(editorWidget => {
                if (editorWidget.parent instanceof DockPanel) {
                    editorWidget.parent.selectWidget(editorWidget)
                }
            });
        }
    }
}
