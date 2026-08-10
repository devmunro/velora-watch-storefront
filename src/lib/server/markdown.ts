import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'em', 's', 'blockquote', 'ul', 'ol', 'li',
  'h2', 'h3', 'h4', 'a', 'hr', 'code', 'pre',
];

/** Render staff-authored Markdown while removing executable or unsafe markup. */
export function renderMarkdown(source: string): string {
  const rendered = marked.parse(source, { async: false, gfm: true, breaks: false });
  return sanitizeHtml(String(rendered), {
    allowedTags,
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'nofollow noopener noreferrer' },
      }),
    },
  });
}

export function estimateReadingMinutes(source: string): number {
  const words = source.replace(/[^\p{L}\p{N}'’-]+/gu, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(120, Math.ceil(words / 220)));
}
