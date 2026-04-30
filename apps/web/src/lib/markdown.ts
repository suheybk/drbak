/**
 * Minimal-safe markdown renderer.
 *
 * The CMS authors are admin role and we trust their input, but defence in
 * depth: we escape HTML before applying the smallest set of transforms that
 * makes content readable (paragraphs, headings, links, lists, emphasis).
 *
 * For richer rendering we'll switch to remark/rehype with rehype-sanitize in
 * Phase 1 close — see security-review.md.
 */

const ESCAPE_HTML = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const renderMarkdown = (md: string): string => {
  const escaped = ESCAPE_HTML(md);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inOl = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      continue;
    }
    let m = /^(#{1,4})\s+(.+)$/.exec(line);
    if (m) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      const level = m[1]!.length;
      out.push(`<h${level}>${inline(m[2]!)}</h${level}>`);
      continue;
    }
    m = /^[-*]\s+(.+)$/.exec(line);
    if (m) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(m[1]!)}</li>`);
      continue;
    }
    m = /^(\d+)\.\s+(.+)$/.exec(line);
    if (m) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inline(m[2]!)}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
};

const inline = (s: string): string =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>',
    );
