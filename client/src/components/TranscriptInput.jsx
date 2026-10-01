import { useState } from 'react';

const ACCEPTED = '.txt,.vtt,.srt';

function TranscriptInput({ onSubmit, loading }) {
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('paste');
  const [fileName, setFileName] = useState('');
  const [readError, setReadError] = useState('');

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setReadError('');
    setFileName(file.name);
    setSourceType('file');

    const reader = new FileReader();

    reader.onload = () => {
      setText(typeof reader.result === 'string' ? reader.result : '');
    };

    reader.onerror = () => {
      setReadError('Could not read that file.');
      setText('');
    };

    reader.readAsText(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text, sourceType);
  };

  const charCount = text.length;

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-modern-gold">Transcript</h2>
        <p className="text-sm text-gray-400">
          Paste a transcript below or upload a{' '}
          <code className="rounded bg-modern-plum px-1 py-0.5 text-xs text-gray-200">.txt</code>,{' '}
          <code className="rounded bg-modern-plum px-1 py-0.5 text-xs text-gray-200">.vtt</code>, or{' '}
          <code className="rounded bg-modern-plum px-1 py-0.5 text-xs text-gray-200">.srt</code> file.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setFileName('');
          setSourceType('paste');
        }}
        placeholder="Paste your meeting transcript here..."
        disabled={loading}
        className="min-h-64 w-full flex-1 resize-y rounded-lg border border-gray-600 bg-modern-bg p-4 font-mono text-sm leading-relaxed text-gray-100 outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-modern-gold focus:ring-2 focus:ring-modern-gold/70 disabled:bg-gray-900 disabled:text-gray-500"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label
            htmlFor="transcript-file"
            className="cursor-pointer rounded-md border border-gray-600 bg-modern-bg px-3 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-modern-gold hover:text-modern-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload file
          </label>
          <input
            id="transcript-file"
            type="file"
            accept={ACCEPTED}
            onChange={handleFile}
            disabled={loading}
            className="sr-only"
          />
          {fileName && <span className="text-sm text-gray-400">{fileName}</span>}
          {readError && <span className="text-sm text-red-400">{readError}</span>}
        </div>

        <span className="text-xs text-gray-500">{charCount.toLocaleString()} characters</span>
      </div>

      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-modern-gold px-5 py-3 text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark focus:outline-none focus:ring-2 focus:ring-modern-gold/70 focus:ring-offset-2 focus:ring-offset-modern-bg disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-modern-bg border-t-transparent"
          />
        )}
        {loading ? 'Generating notes...' : 'Generate Notes'}
      </button>
    </form>
  );
}

export default TranscriptInput;
