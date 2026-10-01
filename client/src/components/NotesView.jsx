import { useCallback, useEffect, useRef, useState } from 'react';

import { getMarkdownExport } from '../api';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { input: '', editable: true };

  if (ISO_DATE.test(raw)) return { input: raw, editable: true };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { input: '', editable: false, raw };

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');

  return { input: `${yyyy}-${mm}-${dd}`, editable: true };
}

function toDraft(notes) {
  return {
    summary: notes?.summary || '',
    keyDecisions: (notes?.keyDecisions || []).map((d) => ({ value: d ?? '' })),
    actionItems: (notes?.actionItems || []).map((item) => {
      const date = normalizeDate(item?.dueDate);
      return {
        task: item?.task || '',
        assignee: item?.assignee || 'Unassigned',
        dueDate: date.input,
        dateFallback: date.editable ? null : date.raw,
      };
    }),
    topics: (notes?.topics || []).map((item) => ({
      topic: item?.topic || '',
      blurb: item?.blurb || '',
    })),
    openQuestions: (notes?.openQuestions || []).map((q) => ({ value: q ?? '' })),
  };
}

function fromDraft(draft) {
  const clean = (v) => String(v ?? '').trim();

  return {
    summary: draft.summary,
    keyDecisions: draft.keyDecisions.map((d) => clean(d.value)).filter(Boolean),
    actionItems: draft.actionItems
      .filter((item) => clean(item.task))
      .map((item) => {
        const assignee = clean(item.assignee);
        const dueDate = clean(item.dueDate) || clean(item.dateFallback);

        return {
          task: clean(item.task),
          assignee: assignee && assignee !== 'Unassigned' ? assignee : 'Unassigned',
          dueDate: dueDate || null,
        };
      }),
    topics: draft.topics
      .filter((item) => clean(item.topic))
      .map((item) => ({ topic: clean(item.topic), blurb: clean(item.blurb) })),
    openQuestions: draft.openQuestions.map((q) => clean(q.value)).filter(Boolean),
  };
}

const inputClass =
  'w-full rounded-md border border-gray-600 bg-modern-bg px-2.5 py-1.5 text-sm text-gray-100 outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-modern-gold focus:ring-2 focus:ring-modern-gold/70';

const removeClass =
  'shrink-0 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors duration-200 hover:bg-red-950/50 hover:text-red-300';

const copyButtonClass =
  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-400 transition-colors duration-200 hover:bg-modern-plum hover:text-modern-gold focus:outline-none focus:ring-2 focus:ring-modern-gold/70';

const cardClass =
  'rounded-xl border border-modern-plum/60 bg-modern-surface p-5 shadow-lg';

const headingClass =
  'mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-modern-gold uppercase';

const badgeClass =
  'rounded-full bg-modern-plum px-2 py-0.5 text-xs font-medium text-gray-100';

const addButtonClass =
  'self-start text-sm font-medium text-modern-gold transition-colors duration-200 hover:text-modern-gold-dark';

function buildSectionText(draft) {
  const trim = (value) => String(value ?? '').trim();

  const decisions = draft.keyDecisions.map((row) => trim(row.value)).filter(Boolean);
  const actionItems = draft.actionItems
    .filter((row) => trim(row.task))
    .map((row) => {
      const meta = [];
      const assignee = trim(row.assignee);
      const dueDate = trim(row.dueDate) || trim(row.dateFallback);

      if (assignee && assignee !== 'Unassigned') meta.push(`Owner: ${assignee}`);
      if (dueDate) meta.push(`Due: ${dueDate}`);

      return meta.length > 0 ? `- ${trim(row.task)} â€” ${meta.join(' | ')}` : `- ${trim(row.task)}`;
    });
  const topics = draft.topics
    .filter((row) => trim(row.topic))
    .map((row) => {
      const blurb = trim(row.blurb);
      return blurb ? `- ${trim(row.topic)}: ${blurb}` : `- ${trim(row.topic)}`;
    });
  const questions = draft.openQuestions.map((row) => trim(row.value)).filter(Boolean);

  return {
    summary: trim(draft.summary),
    keyDecisions: decisions.map((value) => `- ${value}`).join('\n'),
    actionItems: actionItems.join('\n'),
    topics: topics.join('\n'),
    openQuestions: questions.map((value) => `- ${value}`).join('\n'),
  };
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function CopyButton({ sectionKey, text, feedback, onCopy }) {
  const done = feedback?.key === sectionKey && feedback.status === 'copied';
  const failed = feedback?.key === sectionKey && feedback.status === 'error';

  if (!text) return null;

  return (
    <button
      type="button"
      onClick={() => onCopy(sectionKey, text)}
      title={`Copy ${sectionKey} to clipboard`}
      aria-label={`Copy ${sectionKey} to clipboard`}
      className={`${copyButtonClass} ml-auto`}
    >
      {done ? (
        <span className="font-semibold text-modern-gold">Copied!</span>
      ) : (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          Copy
        </>
      )}
      {failed && <span className="text-red-400">Copy failed</span>}
    </button>
  );
}

function NotesView({
  notes,
  meetingId,
  title,
  onSave,
  onRegenerate,
  saving,
  regenerating,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(notes));
  const [syncedNotes, setSyncedNotes] = useState(notes);
  const [feedback, setFeedback] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const copyTimer = useRef(null);
  const exportTimer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(copyTimer.current);
      clearTimeout(exportTimer.current);
    },
    []
  );

  // Reset local edits when a different notes object arrives (e.g. after save or
  // regenerate). Adjusting state during render avoids an extra commit and keeps
  // the draft in sync without an effect.
  if (notes !== syncedNotes) {
    setSyncedNotes(notes);
    setDraft(toDraft(notes));
  }

  const handleCopy = useCallback((sectionKey, text) => {
    clearTimeout(copyTimer.current);

    const clipboard = navigator?.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      setFeedback({ key: sectionKey, status: 'error' });
      copyTimer.current = setTimeout(() => setFeedback(null), 2000);
      return;
    }

    clipboard
      .writeText(text)
      .then(() => setFeedback({ key: sectionKey, status: 'copied' }))
      .catch(() => setFeedback({ key: sectionKey, status: 'error' }))
      .finally(() => {
        copyTimer.current = setTimeout(() => setFeedback(null), 2000);
      });
  }, []);

  if (!notes) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-600 bg-modern-surface p-10">
        <p className="text-center text-sm text-gray-500">
          Generated notes will appear here.
          <br />
          Paste a transcript and select Generate Notes to begin.
        </p>
      </div>
    );
  }

  const updateSummary = (value) => setDraft((d) => ({ ...d, summary: value }));

  const updateDecision = (index, value) =>
    setDraft((d) => ({
      ...d,
      keyDecisions: d.keyDecisions.map((row, i) => (i === index ? { value } : row)),
    }));

  const updateActionItem = (index, field, value) =>
    setDraft((d) => ({
      ...d,
      actionItems: d.actionItems.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  const updateTopic = (index, field, value) =>
    setDraft((d) => ({
      ...d,
      topics: d.topics.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  const updateQuestion = (index, value) =>
    setDraft((d) => ({
      ...d,
      openQuestions: d.openQuestions.map((row, i) => (i === index ? { value } : row)),
    }));

  const addDecision = () =>
    setDraft((d) => ({ ...d, keyDecisions: [...d.keyDecisions, { value: '' }] }));

  const addActionItem = () =>
    setDraft((d) => ({
      ...d,
      actionItems: [...d.actionItems, { task: '', assignee: 'Unassigned', dueDate: '' }],
    }));

  const addTopic = () => setDraft((d) => ({ ...d, topics: [...d.topics, { topic: '', blurb: '' }] }));

  const addQuestion = () =>
    setDraft((d) => ({ ...d, openQuestions: [...d.openQuestions, { value: '' }] }));

  const removeAt = (field, index) =>
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }));

  const handleSave = () => {
    onSave(fromDraft(draft));
  };

  const handleExport = async () => {
    if (!meetingId) return;

    setExporting(true);
    setExportError('');

    try {
      const markdown = await getMarkdownExport(meetingId);
      const slug = slugify(title);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });

      let url;
      let revoke = false;

      if (typeof URL.createObjectURL === 'function') {
        url = URL.createObjectURL(blob);
        revoke = true;
      } else {
        url = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug ? `${slug}-notes` : 'meeting-notes'}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      if (revoke) {
        exportTimer.current = setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (err) {
      setExportError(err.message || 'Could not export these notes.');
    } finally {
      setExporting(false);
    }
  };

  const busy = saving || regenerating;
  const sectionText = buildSectionText(draft);
  const counts = {
    decisions: draft.keyDecisions.length,
    actions: draft.actionItems.length,
    topics: draft.topics.length,
    questions: draft.openQuestions.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            disabled={busy}
            className="rounded-md border border-gray-600 bg-modern-bg px-3 py-1.5 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-modern-gold hover:text-modern-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>

          {editing && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-modern-gold px-3 py-1.5 text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || exporting || !meetingId}
            title={
              meetingId
                ? 'Download these notes as a Markdown file'
                : 'Save these notes first to export them'
            }
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-modern-bg px-3 py-1.5 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-modern-gold hover:text-modern-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-modern-gold border-t-transparent"
              />
            )}
            {exporting ? 'Exporting...' : 'Export as Markdown'}
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-modern-gold/40 bg-modern-gold/10 px-3 py-1.5 text-sm font-medium text-modern-gold transition-colors duration-200 hover:bg-modern-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {regenerating && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-modern-gold border-t-transparent"
              />
            )}
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {exportError && (
        <p
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-300"
        >
          {exportError}
        </p>
      )}

      <section className={cardClass}>
        <h3 className={headingClass}>
          Summary
          <CopyButton
            sectionKey="Summary"
            text={sectionText.summary}
            feedback={feedback}
            onCopy={handleCopy}
          />
        </h3>
        {editing ? (
          <textarea
            value={draft.summary}
            onChange={(e) => updateSummary(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-gray-600 bg-modern-bg p-3 text-sm leading-relaxed text-gray-300 outline-none transition-colors duration-200 focus:border-modern-gold focus:ring-2 focus:ring-modern-gold/70"
          />
        ) : (
          draft.summary ? (
            <p className="text-sm leading-relaxed text-gray-300">{draft.summary}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No summary was returned.</p>
          )
        )}
      </section>

      <section className={cardClass}>
        <h3 className={headingClass}>
          Key Decisions
          <span className={badgeClass}>{counts.decisions}</span>
          <CopyButton
            sectionKey="Key Decisions"
            text={sectionText.keyDecisions}
            feedback={feedback}
            onCopy={handleCopy}
          />
        </h3>

        {editing ? (
          <div className="flex flex-col gap-2">
            {draft.keyDecisions.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.value}
                  onChange={(e) => updateDecision(index, e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeAt('keyDecisions', index)}
                  className={removeClass}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addDecision} className={addButtonClass}>
              + Add decision
            </button>
          </div>
        ) : counts.decisions > 0 ? (
          <ul className="flex flex-col gap-2">
            {draft.keyDecisions.map((row, index) => (
              <li key={index} className="flex gap-2 text-sm leading-relaxed text-gray-300">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-modern-gold" />
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No decisions were made in this meeting.</p>
        )}
      </section>

      <section className={cardClass}>
        <h3 className={headingClass}>
          Action Items
          <span className={badgeClass}>{counts.actions}</span>
          <CopyButton
            sectionKey="Action Items"
            text={sectionText.actionItems}
            feedback={feedback}
            onCopy={handleCopy}
          />
        </h3>

        {editing ? (
          <div className="flex flex-col gap-3">
            {draft.actionItems.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-modern-plum/60 bg-modern-bg/40 p-3">
                <input
                  value={row.task}
                  onChange={(e) => updateActionItem(index, 'task', e.target.value)}
                  placeholder="Task (start with a verb)"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    value={row.assignee}
                    onChange={(e) => updateActionItem(index, 'assignee', e.target.value)}
                    placeholder="Assignee"
                    className={`${inputClass} flex-1 min-w-32`}
                  />
                  {row.dateFallback ? (
                    <input
                      value={row.dateFallback}
                      onChange={(e) => updateActionItem(index, 'dateFallback', e.target.value)}
                      placeholder="Due date (unrecognized format)"
                      title="The model returned a date this browser could not parse. Edit as free text."
                      className={`${inputClass} flex-1 min-w-32`}
                    />
                  ) : (
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => updateActionItem(index, 'dueDate', e.target.value)}
                      className={`${inputClass} flex-1 min-w-32`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt('actionItems', index)}
                    className={removeClass}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addActionItem} className={addButtonClass}>
              + Add action item
            </button>
          </div>
        ) : counts.actions > 0 ? (
          <ul className="flex flex-col divide-y divide-modern-plum/40">
            {draft.actionItems.map((row, index) => (
              <li key={index} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-modern-gold" />
                  <span className="text-sm font-medium text-gray-100">{row.task}</span>
                </div>
                <div className="ml-3.5 flex flex-wrap items-center gap-2">
                  {row.assignee && row.assignee !== 'Unassigned' ? (
                    <span className="rounded-md bg-modern-plum px-2 py-0.5 text-xs font-medium text-gray-100">
                      {row.assignee}
                    </span>
                  ) : (
                    <span className="rounded-md border border-dashed border-gray-600 px-2 py-0.5 text-xs text-gray-500">
                      Unassigned
                    </span>
                  )}
                  {row.dueDate || row.dateFallback ? (
                    <span className="rounded-md border border-modern-gold/30 bg-modern-gold/10 px-2 py-0.5 text-xs font-medium text-modern-gold">
                      Due {row.dueDate || row.dateFallback}
                    </span>
                  ) : (
                    <span className="rounded-md border border-dashed border-gray-600 px-2 py-0.5 text-xs text-gray-500">
                      No due date
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No action items were identified.</p>
        )}
      </section>

      <section className={cardClass}>
        <h3 className={headingClass}>
          Topics
          <span className={badgeClass}>{counts.topics}</span>
          <CopyButton
            sectionKey="Topics"
            text={sectionText.topics}
            feedback={feedback}
            onCopy={handleCopy}
          />
        </h3>

        {editing ? (
          <div className="flex flex-col gap-3">
            {draft.topics.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-modern-plum/60 bg-modern-bg/40 p-3">
                <input
                  value={row.topic}
                  onChange={(e) => updateTopic(index, 'topic', e.target.value)}
                  placeholder="Topic"
                  className={inputClass}
                />
                <textarea
                  value={row.blurb}
                  onChange={(e) => updateTopic(index, 'blurb', e.target.value)}
                  placeholder="Blurb"
                  rows={2}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeAt('topics', index)}
                  className={`${removeClass} self-start`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addTopic} className={addButtonClass}>
              + Add topic
            </button>
          </div>
        ) : counts.topics > 0 ? (
          <ul className="flex flex-col gap-4">
            {draft.topics.map((row, index) => (
              <li key={index}>
                <p className="text-sm font-semibold text-modern-gold">{row.topic}</p>
                {row.blurb && <p className="mt-1 text-sm leading-relaxed text-gray-300">{row.blurb}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No topics were extracted.</p>
        )}
      </section>

      <section className={cardClass}>
        <h3 className={headingClass}>
          Open Questions
          <span className={badgeClass}>{counts.questions}</span>
          <CopyButton
            sectionKey="Open Questions"
            text={sectionText.openQuestions}
            feedback={feedback}
            onCopy={handleCopy}
          />
        </h3>

        {editing ? (
          <div className="flex flex-col gap-2">
            {draft.openQuestions.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.value}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeAt('openQuestions', index)}
                  className={removeClass}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addQuestion} className={addButtonClass}>
              + Add question
            </button>
          </div>
        ) : counts.questions > 0 ? (
          <ul className="flex flex-col gap-2">
            {draft.openQuestions.map((row, index) => (
              <li key={index} className="flex gap-2 text-sm leading-relaxed text-gray-300">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-modern-plum ring-1 ring-modern-gold/40" />
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No open questions. Everything was resolved.</p>
        )}
      </section>
    </div>
  );
}

export default NotesView;
