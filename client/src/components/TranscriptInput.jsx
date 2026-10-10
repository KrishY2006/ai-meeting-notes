import { useState, useEffect } from 'react';

const ACCEPTED = '.txt,.vtt,.srt';

function TranscriptInput({ onSubmit, loading }) {
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('paste');
  const [fileName, setFileName] = useState('');
  const [readError, setReadError] = useState('');

  useEffect(() => {
    if (window.location.hash.startsWith('#transcript=')) {
      const rawEncoded = window.location.hash.replace('#transcript=', '');
      const decodedText = decodeURIComponent(rawEncoded);
      if (decodedText) {
        setText(decodedText);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setReadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result || '');
      setSourceType('file');
    };
    reader.onerror = () => {
      setReadError('Failed to read file. Please paste your text directly.');
    };
    reader.readAsText(file);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim(), sourceType);
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="transcript-input" className="block text-sm font-medium text-gray-300 mb-1">
          Meeting Transcript
        </label>
        <textarea
          id="transcript-input"
          rows={12}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSourceType('paste');
          }}
          placeholder="Paste your meeting transcript here, or capture it with the Chrome extension..."
          className="w-full rounded-lg border border-modern-plum/50 bg-modern-bg p-3 text-sm text-gray-100 placeholder-gray-500 focus:border-modern-gold focus:outline-none focus:ring-1 focus:ring-modern-gold"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-modern-gold">
          <span>Upload file ({ACCEPTED})</span>
          <input
            type="file"
            accept={ACCEPTED}
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {fileName && (
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            Loaded: {fileName}
          </span>
        )}

        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="rounded-lg bg-modern-gold px-5 py-2.5 text-sm font-semibold text-modern-bg transition hover:bg-modern-gold-dark disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Generate Notes'}
        </button>
      </div>

      {readError && (
        <p className="text-xs text-red-400">{readError}</p>
      )}
    </form>
  );
}

export default TranscriptInput;