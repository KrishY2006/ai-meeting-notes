import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMeetings, deleteMeeting } from '../api';

function formatDate(value) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function History() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Loading starts true, so the effect body never needs a synchronous setState.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getMeetings();
        if (!cancelled) setMeetings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load your meetings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id) => {
    const meeting = meetings.find((m) => m._id === id);
    const confirmed = window.confirm(
      `Delete "${meeting?.title || 'this meeting'}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setError('');

    try {
      await deleteMeeting(id);
      setMeetings((current) => current.filter((m) => m._id !== id));
    } catch (err) {
      setError(err.message || 'Could not delete that meeting.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-modern-gold">History</h1>
          <p className="text-sm text-gray-400">
            {loading ? 'Loading your meetings...' : `${meetings.length} saved meeting${meetings.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md bg-modern-gold px-3.5 py-2 text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark focus:outline-none focus:ring-2 focus:ring-modern-gold/70 focus:ring-offset-2 focus:ring-offset-modern-bg"
        >
          New meeting
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-modern-plum/60 bg-modern-surface p-10 text-center shadow-lg">
          <span
            aria-hidden="true"
            className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-modern-gold border-t-transparent"
          />
          <p className="text-sm text-gray-400">Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-600 bg-modern-surface p-10 text-center">
          <p className="text-sm text-gray-400">
            No meetings saved yet.
            <br />
            Generate your first set of notes in the Studio.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {meetings.map((meeting) => {
            const isDeleting = deletingId === meeting._id;

            return (
              <li
                key={meeting._id}
                className="flex flex-col gap-3 rounded-xl border border-modern-plum/60 bg-modern-surface p-5 shadow-lg"
              >
                <div>
                  <h2 className="truncate text-base font-semibold text-gray-100">{meeting.title}</h2>
                  <p className="mt-0.5 text-sm text-gray-400">{formatDate(meeting.createdAt)}</p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/meeting/${meeting._id}`}
                    className="flex-1 rounded-md bg-modern-gold px-3 py-2 text-center text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark focus:outline-none focus:ring-2 focus:ring-modern-gold/70 focus:ring-offset-2 focus:ring-offset-modern-surface"
                  >
                    View / Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(meeting._id)}
                    disabled={isDeleting}
                    className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-900/50 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-modern-gold/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
