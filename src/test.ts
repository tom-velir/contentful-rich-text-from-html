import richTextFromHtml from './index.js';
import examples from './examples.js';

richTextFromHtml(examples[0], (node) => {
  const archivedLinkRegEx = /{page_\d+}/;
  if (
    node.type === 'tag' &&
    node.name === 'a' &&
    typeof node.attrs.href === 'string' &&
    archivedLinkRegEx.test(node.attrs.href)
  )
    return false;

  return true;
});
