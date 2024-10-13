import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { Mic, Search, Check, Trash2 } from 'lucide-react';
import Login from './Login';

interface VoiceNote {
  id: string;
  date: string;
  text: string;
  completed: boolean;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }

    const savedNotes = localStorage.getItem('voiceNotes');
    if (savedNotes) {
      setVoiceNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('voiceNotes', JSON.stringify(voiceNotes));
  }, [voiceNotes]);

  const startRecording = async () => {
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      const audioChunks: Blob[] = [];

      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks);
        const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
        await transcribeAudio(audioFile);
      });

      recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const transcribeAudio = async (audioFile: File) => {
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transcribedText = data.text;

      const newNote: VoiceNote = {
        id: Date.now().toString(),
        date: format(selectedDate, 'yyyy-MM-dd'),
        text: transcribedText,
        completed: false,
      };
      setVoiceNotes([...voiceNotes, newNote]);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setRecording(false);
    }
  };

  const toggleNoteCompletion = (id: string) => {
    setVoiceNotes(voiceNotes.map(note =>
      note.id === id ? { ...note, completed: !note.completed } : note
    ));
  };

  const deleteNote = (id: string) => {
    setVoiceNotes(voiceNotes.filter(note => note.id !== id));
  };

  const filteredNotes = voiceNotes.filter(note =>
    note.date === format(selectedDate, 'yyyy-MM-dd') &&
    note.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLoggedIn) {
    return <Login onLogin={setIsLoggedIn} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-600">Voice Notes</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              className="w-full"
            />
            <button
              onClick={startRecording}
              disabled={recording}
              className={`mt-4 w-full py-2 px-4 rounded-md text-white font-semibold ${
                recording ? 'bg-red-500' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {recording ? 'Recording...' : 'Record Voice Note'}
              <Mic className="inline-block ml-2 w-5 h-5" />
            </button>

            {recording && (
              <button
                onClick={stopRecording}
                className="mt-4 w-full py-2 px-4 rounded-md bg-yellow-600 text-white font-semibold hover:bg-yellow-700"
              >
                Stop Recording
              </button>
            )}
          </div>
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <Search className="inline-block ml-2 w-5 h-5 text-gray-500" />
            </div>
            <ul className="space-y-2">
              {filteredNotes.map(note => (
                <li key={note.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className={note.completed ? 'line-through text-gray-500' : ''}>
                    {note.text}
                  </span>
                  <div>
                    <button
                      onClick={() => toggleNoteCompletion(note.id)}
                      className="mr-2 text-green-500 hover:text-green-700"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
