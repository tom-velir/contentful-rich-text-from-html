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
// import { flatMap } from 'lodash';
import examples from './examples.js';

type HtmlNodes = ReturnType<typeof parse>;
type HtmlNode = HtmlNodes[0];
interface HtmlLinkNode extends HtmlNode {
  name: 'a';
  attrs: {
    href: string;
  };
}

function isLink(node: HtmlNode): node is HtmlLinkNode {
  return node.name === 'a';
}

function richTextFromHtml(
  html: string,
  filter?: (node: HtmlNode) => HtmlNode | boolean,
): Document {
  const ast = parse(html);

  let modifiedAst: HtmlNodes | undefined;
  if (filter) modifiedAst = modifyAst(ast, filter);

  console.log(
    util.inspect(modifiedAst ?? ast, {
      showHidden: false,
      depth: null,
      colors: true,
    }),
  );

  // return astToRichTextDocument(modifiedAst ?? ast);
}

function buildHyperlink(node: HtmlLinkNode): Hyperlink {
  // Transform children to rich text text nodes. Flag non-text nodes
  const content: Text[] = [];
  for (const child of node.children || []) {
    if (child.type !== 'text') {
      console.warn(
        `Warning: Found child element "${child.type}" of hyperlink. Contentful only allows text children of hyperlinks. This element will be removed from the output.`,
      );
      continue;
    } else {
      content.push({
        nodeType: 'text',
        value: child.content ?? '',
        marks: [],
        data: {},
      });
    }
  }

  const hyperlink: Hyperlink = {
    nodeType: INLINES.HYPERLINK,
    data: { uri: node.attrs.href },
    content,
  };

  return hyperlink;
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
