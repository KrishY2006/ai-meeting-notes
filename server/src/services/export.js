function clean(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function isBlank(value) {
  return clean(value).length === 0;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

// A single line of user/LLM text can contain characters that would break out of a
// Markdown construct. Only the characters that are actually meaningful inline are
// escaped, so dates and ordinary prose stay readable in the exported file.
const INLINE_SPECIALS = /([\\`*_[\]])/g;
const LINE_START_SPECIALS = /^[#>\-+|]/;
const ORDERED_LIST_START = /^(\d+)([.)])(?=\s|$)/;

function escapeInline(text) {
  return String(text)
    .replace(INLINE_SPECIALS, '\\$1')
    .replace(/\n+/g, ' ')
    .trim();
}

// List items additionally need protection against a leading marker that would
// otherwise turn the line into a heading, blockquote, or nested list.
function escapeBullet(text) {
  const escaped = escapeInline(text);

  const ordered = escaped.match(ORDERED_LIST_START);
  if (ordered) {
    return `${ordered[1]}\\${ordered[2]}${escaped.slice(ordered[0].length)}`;
  }

  if (LINE_START_SPECIALS.test(escaped)) {
    return `\\${escaped}`;
  }

  return escaped;
}

function escapeHeading(text) {
  return escapeInline(text).replace(/^#+\s*/, '');
}

function formatDate(value) {
  if (isBlank(value)) return '';

  const parsed = new Date(clean(value));
  if (Number.isNaN(parsed.getTime())) return clean(value);

  return parsed.toISOString().slice(0, 10);
}

function section(title, body) {
  return `## ${title}\n\n${body.trim()}`;
}

function convertToMarkdown(notes, { title, generatedAt } = {}) {
  const source = notes && typeof notes === 'object' && !Array.isArray(notes) ? notes : {};

  const heading = isBlank(title) ? 'Meeting Notes' : clean(title);
  const lines = [`# ${escapeHeading(heading)}`, ''];

  const date = formatDate(generatedAt);
  if (date) {
    lines.push(`_Exported ${date}_`, '');
  }

  const summary = clean(source.summary);
  if (summary) {
    lines.push(section('Summary', summary), '');
  }

  const decisions = asList(source.keyDecisions).filter((d) => !isBlank(d));
  if (decisions.length > 0) {
    lines.push(
      section(
        'Key Decisions',
        decisions.map((d) => `- ${escapeBullet(clean(d))}`).join('\n')
      ),
      ''
    );
  }

  const actionItems = asList(source.actionItems).filter((item) => item && !isBlank(item.task));
  if (actionItems.length > 0) {
    const rows = actionItems.map((item) => {
      const task = `**${escapeBullet(clean(item.task))}**`;

      const assignee = clean(item.assignee);
      const dueDate = clean(item.dueDate);
      const meta = [
        isBlank(assignee) || assignee === 'Unassigned' ? '' : `Owner: ${escapeInline(assignee)}`,
        isBlank(dueDate) ? '' : `Due: ${escapeInline(formatDate(dueDate))}`,
      ].filter(Boolean);

      return meta.length > 0 ? `- ${task} — ${meta.join(' | ')}` : `- ${task}`;
    });

    lines.push(section('Action Items', rows.join('\n')), '');
  }

  const topics = asList(source.topics).filter((item) => item && !isBlank(item.topic));
  if (topics.length > 0) {
    const rendered = topics
      .map((topic) => {
        const blurb = clean(topic.blurb);
        return blurb
          ? `- **${escapeInline(clean(topic.topic))}** — ${escapeInline(blurb)}`
          : `- **${escapeInline(clean(topic.topic))}**`;
      })
      .join('\n');

    lines.push(section('Topics', rendered), '');
  }

  const openQuestions = asList(source.openQuestions).filter((q) => !isBlank(q));
  if (openQuestions.length > 0) {
    lines.push(
      section(
        'Open Questions',
        openQuestions.map((q) => `- ${escapeBullet(clean(q))}`).join('\n')
      ),
      ''
    );
  }

  if (lines.length === 2) {
    lines.push('_No notes were generated for this meeting._', '');
  }

  return lines.join('\n').trimEnd() + '\n';
}

module.exports = { convertToMarkdown };
