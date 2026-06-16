import { Bot } from 'lucide-react';
import { useState } from 'react';

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <div className="ai-assistant">
      {open ? (
        <div className="ai-assistant__panel">
          Próximamente podrás consultar brechas, recomendaciones y análisis del diagnóstico.
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Asistente IA">
        <Bot size={18} />
        Asistente IA
      </button>
    </div>
  );
}
