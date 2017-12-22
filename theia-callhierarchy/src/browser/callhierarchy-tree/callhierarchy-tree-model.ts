/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { TreeModel, TreeServices, ITreeNode, OpenerService, open, OpenerOptions } from "@theia/core/lib/browser";
import { CallHierarchyTree, DefinitionNode, CallerNode } from "./callhierarchy-tree";
import { CallHierarchyServiceProvider } from "../callhierarchy-service";
import { Range, Location } from 'vscode-languageserver-types';
import URI from "@theia/core/lib/common/uri";

@injectable()
export class CallHierarchyTreeModel extends TreeModel {

    constructor(
        @inject(OpenerService) readonly openerService: OpenerService,
        @inject(CallHierarchyTree) protected readonly tree: CallHierarchyTree,
        @inject(TreeServices) services: TreeServices,
        @inject(CallHierarchyServiceProvider) protected readonly callHierarchyServiceProvider: CallHierarchyServiceProvider
    ) {
        super(tree, services);
    }

    async initializeCallHierarchy(languageId: string | undefined, location: Location | undefined): Promise<void> {
        this.tree.root = undefined;
        this.tree.callHierarchyService = undefined;
        if (languageId && location) {
            const callHierarchyService = this.callHierarchyServiceProvider.get(languageId);
            if (callHierarchyService) {
                this.tree.callHierarchyService = callHierarchyService;
                const rootDefinition = await callHierarchyService.getRootDefinition(location);
                if (rootDefinition) {
                    const rootNode = DefinitionNode.create(rootDefinition, undefined);
                    this.tree.root = rootNode
                }
            }
        }
    }

    protected doOpenNode(node: ITreeNode): void {
        let location: Location | undefined;
        if (DefinitionNode.is(node)) {
            location = node.definition.location;
        }
        if (CallerNode.is(node)) {
            location = node.caller.references[0];
        }
        if (location) {
            open(
                this.openerService,
                new URI(location.uri),
                <OpenerOptions> {
                    selection: Range.create(location.range.start, location.range.start)
                }
            );
        } else {
            super.doOpenNode(node);
        }
    }

}
