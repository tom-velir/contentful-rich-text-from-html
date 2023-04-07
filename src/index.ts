import util from 'node:util';
import {
  BLOCKS,
  INLINES,
  Document,
  Node,
  TopLevelBlock,
  Hyperlink,
  Text,
  Mark,
} from '@contentful/rich-text-types';
import { parse } from 'html-to-ast';
// import { flatMap } from 'lodash';

type HtmlNodes = ReturnType<typeof parse>;
type HtmlNode = HtmlNodes[0];
interface HtmlLinkNode extends HtmlNode {
  name: 'a';
  attrs: {
    href: string;
  };
}

const nodeMapping = new Map<string, string>([
  ['p', BLOCKS.PARAGRAPH],
  ['h1', BLOCKS.HEADING_1],
  ['h2', BLOCKS.HEADING_2],
  ['h3', BLOCKS.HEADING_3],
  ['h4', BLOCKS.HEADING_4],
  ['h5', BLOCKS.HEADING_5],
  ['h6', BLOCKS.HEADING_6],
  ['ol', BLOCKS.OL_LIST],
  ['ul', BLOCKS.UL_LIST],
  ['li', BLOCKS.LIST_ITEM],
  ['hr', BLOCKS.HR],
  ['blockquote', BLOCKS.QUOTE],
  ['table', BLOCKS.TABLE],
  ['tr', BLOCKS.TABLE_ROW],
  ['td', BLOCKS.TABLE_CELL],
  ['th', BLOCKS.TABLE_HEADER_CELL],
  ['a', INLINES.HYPERLINK],
]);

type Config = {
  buildCustomNode?: (node: HtmlNode) => Node | null;
  preFilter?: (node: HtmlNode) => HtmlNode | boolean;
};

function isLink(node: HtmlNode): node is HtmlLinkNode {
  return node.name === 'a';
}

/**
 * Convert HTML into Contentful rich text nodes
 * @param html - HTML to convert to Contentful Rich Text document format
 * @param config.buildCustomNode - Callback to handle any HTML elements that you'd like to custom transform, or as a fallback for elements that don't have a corresponding Contentful rich text node. Return `null` for elements that you want to pass through to the default transformer
 * @param config.preFilter - Callback to modify the HTML AST prior to it being transformed to Contentful rich text nodes. This is useful for stripping out or modifying HTML elements, attributes, or text that you don't want to be transformed
 */
function richTextFromHtml(html: string, config: Config): Document {
  const ast = parse(html);

  let modifiedAst: HtmlNodes | undefined;
  if (config.preFilter) modifiedAst = modifyAst(ast, config.preFilter);

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

function htmlToRichTextNode(
  node: HtmlNode,
  buildCustomNode?: Config['buildCustomNode'],
): Node {
  let maybeCustomNode: Node | null | undefined;
  if (buildCustomNode) {
    maybeCustomNode = buildCustomNode(node);
  }

  // If maybeCustomTransformedNode is an object, user has returned
  // a custom transformed node that we'll use instead
  if (typeof maybeCustomNode === 'object' && maybeCustomNode !== null)
    return maybeCustomNode;

  if (isLink(node)) {
    return buildHyperlink(node);
  }

  // TODO: Add support for table elements
}

function htmlToRichTextNodes(
  nodes: HtmlNodes,
  buildCustomNode?: Config['buildCustomNode'],
): Node[] {
  if (!nodes) {
    return [];
  }

  const rtNodes = nodes.map((node) => {
    htmlToRichTextNode(node, buildCustomNode);
  });

  return rtNodes;
}

function astToRichTextDocument(
  ast: HtmlNodes,
  buildCustomNode?: Config['buildCustomNode'],
): Document {
  const content = htmlToRichTextNodes(ast, buildCustomNode);

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
