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

type HtmlNodes = ReturnType<typeof parse>;
type HtmlNode = HtmlNodes[0];
interface HtmlLinkNode extends HtmlNode {
  name: 'a';
  attrs: {
    href: string;
  };
}

type Config = {
  customTransform?: (node: HtmlNode) => Node | null;
  preFilter?: (node: HtmlNode) => HtmlNode | boolean;
};

function isLink(node: HtmlNode): node is HtmlLinkNode {
  return node.name === 'a';
}

/**
 * Convert HTML into Contentful rich text nodes
 * @param html - HTML to convert to Contentful Rich Text document format
 * @param config.customTransform - Callback to handle any HTML elements that you'd like to custom transform, or as a fallback for elements that don't have a corresponding Contentful rich text node. Return `null` for elements that you want pass through to the default transformer
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
  customTransform?: Config['customTransform'],
): Node {
  let maybeCustomTransformedNode: Node | null | undefined;
  if (customTransform) {
    maybeCustomTransformedNode = customTransform(node);
  }

  // If maybeCustomTransformedNode is an object, user has returned
  // a custom transformed node that we'll use instead
  if (
    typeof maybeCustomTransformedNode === 'object' &&
    maybeCustomTransformedNode !== null
  )
    return maybeCustomTransformedNode;

  if (isLink(node)) {
    return buildHyperlink(node);
  }

  // TODO: Add support for table elements
}

function htmlToRichTextNodes(
  nodes: HtmlNodes,
  customTransform?: Config['customTransform'],
): Node[] {
  if (!nodes) {
    return [];
  }

  const rtNodes = nodes.map((node) => {
    htmlToRichTextNode(node, customTransform);
  });

  return rtNodes;
}

function astToRichTextDocument(
  ast: HtmlNodes,
  customTransform?: Config['customTransform'],
): Document {
  const content = htmlToRichTextNodes(ast, customTransform);

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
