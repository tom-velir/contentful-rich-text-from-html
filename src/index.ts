import util from 'node:util';
import {
  BLOCKS,
  Document,
  INLINES,
  Node,
  TopLevelBlock,
  Hyperlink,
  Text,
  Mark,
} from '@contentful/rich-text-types';
import { parse } from 'html-to-ast';
import { flatMap } from 'lodash';
import examples from './examples.js';

type HtmlNodes = ReturnType<typeof parse>;
type HtmlNode = HtmlNodes[0];
interface HtmlLinkNode extends HtmlNode {
  name: 'a';
}

function isLink(node: HtmlNode): node is HtmlLinkNode {
  return node.name === 'a';
}

function richTextFromHtml(
  html: string,
  filter?: (node: HtmlNode) => HtmlNode | boolean,
): Document {
  const ast = parse(html);

  const modifiedAst = modifyAst(ast, filter);
  console.log(
    util.inspect(modifiedAst, { showHidden: false, depth: null, colors: true }),
  );
  // return astToRichTextDocument(ast);
}

function buildHyperlink(node: HtmlLinkNode): Hyperlink | Text {
  const content = htmlToRichTextNodes(node.children) as Text[]; // TODO: Handle non-text nodes

  // if (typeof node.attrs.href !== 'string') {
  //   return {
  //     nodeType: 'text',
  //     value: content,
  //     marks: [],
  //   };
  // }

  // const hyperlink: Hyperlink = {
  //   nodeType: INLINES.HYPERLINK,
  //   data: { uri: node.attrs.href },
  //   content,
  // };
}

function htmlToRichTextNode(node: HtmlNode) {
  console.log(node);
  if (isLink(node)) {
    return buildHyperlink(node);
  }
}

function htmlToRichTextNodes(nodes: HtmlNodes): Node[] {
  if (!nodes) {
    return [];
  }

  const rtNodes = nodes.map((node) => {
    htmlToRichTextNode(node);
  });
}

function astToRichTextDocument(ast: HtmlNodes): Document {
  const content = htmlToRichTextNodes(ast);

  return {
    nodeType: BLOCKS.DOCUMENT,
    data: {},
    content: content as TopLevelBlock[], // TODO: Validate these are top level blocks
  };
  // for (const node of ast) {
  //   const { type } = node;
  //   if(type === 'text') {

  //   }
  // }
}

function modifyAst(
  ast: HtmlNodes,
  filter: (node: HtmlNode) => HtmlNode | boolean,
): HtmlNodes {
  for (const node of ast.slice()) {
    const filterResult = filter(node);

    if (typeof filterResult === 'object') {
      ast[ast.indexOf(node)] = filterResult;
    } else if (filterResult === false) {
      console.log('removing', node);
      ast.splice(ast.indexOf(node), 1); // Remove any nodes that don't pass filter
    }

    if (node.children) {
      modifyAst(node.children, filter);
    }
  }

  return ast;
}

export default richTextFromHtml;
