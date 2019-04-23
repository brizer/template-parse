'use strict';
const util = require('util');

const defaultTreeAdapter = require('../tree-adapters/default');
const mergeOptions = require('../utils/merge-options');
const doctype = require('../common/doctype');
const HTML = require('../common/html');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

//Default serializer options
const DEFAULT_OPTIONS = {
    treeAdapter: defaultTreeAdapter
};

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00a0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

//Serializer
class Serializer {
    constructor(node, options) {
        this.options = mergeOptions(DEFAULT_OPTIONS, options);
        this.treeAdapter = this.options.treeAdapter;

        this.html = '';
        this.startNode = node;
    }

    //API
    serialize() {
        this._serializeChildNodes(this.startNode);

        return this.html;
    }

    //Internals
    _serializeChildNodes(parentNode) {
        let childNodes = this.treeAdapter.getChildNodes(parentNode);

        if (childNodes) {
            childNodes = this.formatNodeList(childNodes);
            for (let i = 0, cnLength = childNodes.length; i < cnLength; i++) {
                const currentNode = childNodes[i];
                if (this.treeAdapter.isElementNode(currentNode)) {
                    this._serializeElement(currentNode);
                } else if (this.treeAdapter.isTextNode(currentNode)) {
                    this._serializeTextNode(currentNode);
                } else if (this.treeAdapter.isCommentNode(currentNode)) {
                    this._serializeCommentNode(currentNode);
                } else if (this.treeAdapter.isDocumentTypeNode(currentNode)) {
                    this._serializeDocumentTypeNode(currentNode);
                }
            }
        }
    }

    formatNodeList(childNodes) {
        for (let i = 0, cnLength = childNodes.length; i < cnLength; i++) {
            let currentNode = childNodes[i];
            const nextIndex = this.findNextElementNode(childNodes, i + 1);
            let nextNode = i < childNodes.length ? childNodes[nextIndex] : undefined;
            if (nextNode) {
                //if nextNode afterTxt == preTxt, then change its preTxt with curNodes aftertTxt
                if (nextNode.afterTxt && nextNode.preTxt && nextNode.preTxt === nextNode.afterTxt) {
                    let txt = currentNode.afterTxt;
                    currentNode.afterTxt = nextNode.preTxt;
                    nextNode.afterTxt = txt;
                    nextNode.preTxt = ' ';
                }
            }
        }
        return childNodes;
    }

    findNextElementNode(nodeLists, i) {
        for (let len = nodeLists.length; i < len; i++) {
            if (nodeLists[i].nodeName != '#text' && nodeLists[i].nodeName != '#comment') {
                return i;
            }
        }
    }

    _serializeElement(node, nextNode) {
        const tn = this.treeAdapter.getTagName(node);
        const ns = this.treeAdapter.getNamespaceURI(node);
        if (node.convertToTxt && node.preTxt) {
            this.html += node.preTxt;
        } else {
            if (node.preTxt) {
                this.html += `${node.preTxt}<${tn}`;
            } else {
                this.html += '<' + tn;
            }
            this._serializeAttributes(node);
            this.html += '>';
        }

        //if it is a single closed tag,
        //we also have to judge the node.afterTxt and node.preTxt

        if (
            tn !== $.AREA &&
            tn !== $.BASE &&
            tn !== $.BASEFONT &&
            tn !== $.BGSOUND &&
            tn !== $.BR &&
            tn !== $.COL &&
            tn !== $.EMBED &&
            tn !== $.FRAME &&
            tn !== $.HR &&
            tn !== $.IMG &&
            tn !== $.INPUT &&
            tn !== $.KEYGEN &&
            tn !== $.LINK &&
            tn !== $.META &&
            tn !== $.PARAM &&
            tn !== $.SOURCE &&
            tn !== $.TRACK &&
            tn !== $.WBR
        ) {
            const childNodesHolder =
                tn === $.TEMPLATE && ns === NS.HTML ? this.treeAdapter.getTemplateContent(node) : node;

            this._serializeChildNodes(childNodesHolder);

            if (node.convertToTxt && node.afterTxt) {
                this.html += node.afterTxt;
            } else {
                this.html += '</' + tn + '>';
                if (node.afterTxt) {
                    this.html += `${node.afterTxt}`;
                }
            }
        } else {
            if (node.afterTxt) {
                this.html += `${node.afterTxt}`;
            }
        }
    }

    _serializeAttributes(node) {
        const attrs = this.treeAdapter.getAttrList(node);

        for (let i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
            const attr = attrs[i];
            const value = Serializer.escapeString(attr.value, true);
            if (!attr.hide) {
                this.html += ' ';

                if (!attr.namespace) {
                    this.html += attr.name;
                } else if (attr.namespace === NS.XML) {
                    this.html += 'xml:' + attr.name;
                } else if (attr.namespace === NS.XMLNS) {
                    if (attr.name !== 'xmlns') {
                        this.html += 'xmlns:';
                    }

                    this.html += attr.name;
                } else if (attr.namespace === NS.XLINK) {
                    this.html += 'xlink:' + attr.name;
                } else {
                    this.html += attr.prefix + ':' + attr.name;
                }

                this.html += '="' + value + '"';
            }
        }
    }

    _serializeTextNode(node) {
        const content = this.treeAdapter.getTextNodeContent(node);
        const parent = this.treeAdapter.getParentNode(node);
        let parentTn = void 0;

        if (parent && this.treeAdapter.isElementNode(parent)) {
            parentTn = this.treeAdapter.getTagName(parent);
        }

        if (
            parentTn === $.STYLE ||
            parentTn === $.SCRIPT ||
            parentTn === $.XMP ||
            parentTn === $.IFRAME ||
            parentTn === $.NOEMBED ||
            parentTn === $.NOFRAMES ||
            parentTn === $.PLAINTEXT ||
            parentTn === $.NOSCRIPT
        ) {
            this.html += content;
        } else {
            this.html += Serializer.escapeString(content, false);
        }
    }

    _serializeCommentNode(node) {
        this.html += '<!--' + this.treeAdapter.getCommentNodeContent(node) + '-->';
    }

    _serializeDocumentTypeNode(node) {
        const name = this.treeAdapter.getDocumentTypeNodeName(node);

        this.html += '<' + doctype.serializeContent(name, null, null) + '>';
    }
}

// NOTE: used in tests and by rewriting stream
Serializer.escapeString = function(str, attrMode) {
    return str;
    // str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    // if (attrMode) {
    //     str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');
    // } else {
    //     str = str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
    // }

    // return str;
};

module.exports = Serializer;
