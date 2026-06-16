import { Mic, RotateCcw, Square } from 'lucide-react';
import { useRef, useState } from 'react';

export default function AudioRecorder({ value, onChange, maxSeconds }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onChange({ blob, url: URL.createObjectURL(blob), duration: seconds });
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((current) => {
          const next = current + 1;
          if (maxSeconds && next >= Number(maxSeconds)) stop();
          return next;
        });
      }, 1000);
    } catch {
      setError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setRecording(false);
  };

  const reset = () => {
    onChange(null);
    setSeconds(0);
    setError('');
  };

  return (
    <div className="audio-recorder">
      {error ? <p className="alert error">{error}</p> : null}
      <div className="audio-controls">
        {!recording ? (
          <button className="secondary-button compact" type="button" onClick={start}>
            <Mic size={16} />
            Iniciar grabación
          </button>
        ) : (
          <button className="secondary-button compact" type="button" onClick={stop}>
            <Square size={16} />
            Detener
          </button>
        )}
        <button className="secondary-button compact" type="button" onClick={reset} disabled={!value}>
          <RotateCcw size={16} />
          Volver a grabar
        </button>
        <span>{seconds}s</span>
      </div>
      {value?.url ? <audio controls src={value.url} /> : null}
    </div>
  );
}
