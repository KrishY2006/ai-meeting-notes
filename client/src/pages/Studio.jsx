import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import TranscriptInput from '../components/TranscriptInput';
import NotesView from '../components/NotesView';
import { generateNotes, getMeeting, updateNotes, regenerateNotes } from '../api';

function StudioInner({ initialMeetingId }) {
  const navigate = useNavigate();

  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialMeetingId));
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadedFromServer, setLoadedFromServer] = useState(Boolean(initialMeetingId));

  // Remounting on id change (via `key`) means this effect only ever runs once
  // per meeting, so state never needs a synchronous reset inside the effect body.
  useEffect(() => {
    if (!initialMeetingId) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const meeting = await getMeeting(initialMeetingId);
        if (cancelled) return;
        setMeetingId(meeting._id);
        setTitle(meeting.title || '');
        setNotes(meeting.notes);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Could not load that meeting.');

        if (err.status === 404) {
          navigate('/', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialMeetingId, navigate]);

  const handleSubmit = useCallback(
    async (transcriptText, sourceType) => {
      setLoading(true);
      setError('');

      try {
        const meeting = await generateNotes(transcriptText, sourceType);
        setMeetingId(meeting._id);
        setTitle(meeting.title || '');
        setNotes(meeting.notes);
        setLoadedFromServer(true);
        navigate(`/meeting/${meeting._id}`, { replace: true });
      } catch (err) {
        setError(err.message || 'Something went wrong while generating notes.');
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  const handleSave = async (updatedNotes) => {
    if (!meetingId) return;

    setSaving(true);
    setError('');

    try {
      const meeting = await updateNotes(meetingId, updatedNotes);
      setNotes(meeting.notes);
    } catch (err) {
      setError(err.message || 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!meetingId) return;

    setRegenerating(true);
    setError('');

    try {
      const meeting = await regenerateNotes(meetingId);
      setNotes(meeting.notes);
    } catch (err) {
      setError(err.message || 'Could not regenerate these notes.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleStartNew = () => {
    setMeetingId(null);
    setTitle('');
    setNotes(null);
    setLoadedFromServer(false);
    setError('');
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2">
      <div className="rounded-xl border border-modern-plum/60 bg-modern-surface p-6 shadow-lg">
        {loadedFromServer ? (
          <div className="flex h-full flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold text-modern-gold">Loaded meeting</h2>
              <p className="mt-1 text-sm text-gray-400">
                You are viewing saved notes. To analyze different content, start over.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNew}
              className="self-start rounded-lg bg-modern-gold px-5 py-3 text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark focus:outline-none focus:ring-2 focus:ring-modern-gold/70 focus:ring-offset-2 focus:ring-offset-modern-surface"
            >
              Start a new meeting
            </button>
          </div>
        ) : (
          <TranscriptInput onSubmit={handleSubmit} loading={loading} />
        )}
      </div>

      <div className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-modern-plum/60 bg-modern-surface p-5 shadow-lg">
            <span
              aria-hidden="true"
              className="mb-3 block h-4 w-4 animate-spin rounded-full border-2 border-modern-gold border-t-transparent"
            />
            <p className="text-sm text-gray-400">Processing transcript...</p>
          </div>
        ) : (
          <NotesView
            notes={notes}
            meetingId={meetingId}
            title={title}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            saving={saving}
            regenerating={regenerating}
          />
        )}
      </div>
    </div>
  );
}

export default function Studio() {
  const { id } = useParams();

  return <StudioInner key={id || 'new'} initialMeetingId={id || null} />;
}
