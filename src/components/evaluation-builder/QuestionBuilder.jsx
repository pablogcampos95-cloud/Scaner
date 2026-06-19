import { useEffect, useState } from 'react';
import QuestionRenderer from '../evaluation-runner/QuestionRenderer.jsx';
import { getAreasActivas, getCompetenciasActivas, getPerfilesOperativosActivos } from '../../services/catalogosService.js';
import { createQuestion, createQuestionOption, updateQuestion } from '../../services/evaluacionesService.js';
import AudioQuestionSettings from './AudioQuestionSettings.jsx';
import KpiQuestionSettings from './KpiQuestionSettings.jsx';
import QuestionOptionsEditor from './QuestionOptionsEditor.jsx';
import QuestionTypeSelector from './QuestionTypeSelector.jsx';
import RubricEditor from './RubricEditor.jsx';
import SpreadsheetQuestionSettings from './SpreadsheetQuestionSettings.jsx';

const initialOptions = [
  { localId: '1', option_text: '', is_correct: false },
  { localId: '2', option_text: '', is_correct: false },
  { localId: '3', option_text: '', is_correct: false },
  { localId: '4', option_text: '', is_correct: false },
];

export default function QuestionBuilder({ evaluacionId, sections, onCreated }) {
  const [question, setQuestion] = useState({
    evaluacion_id: evaluacionId,
    section_id: '',
    question_type: '',
    titulo: '',
    descripcion: '',
    instrucciones: '',
    puntaje: 1,
    required: true,
    scoring_mode: 'auto',
    competencia_id: '',
    area_id: '',
    perfil_operativo_id: '',
    nivel: '',
  });
  const [catalogs, setCatalogs] = useState({ areas: [], perfiles: [], competencias: [] });
  const [options, setOptions] = useState(initialOptions);
  const [settings, setSettings] = useState({});
  const [correctAnswer, setCorrectAnswer] = useState({});
  const [rubric, setRubric] = useState({});
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState({ error: '', saving: false });

  useEffect(() => {
    Promise.all([getAreasActivas(), getPerfilesOperativosActivos(), getCompetenciasActivas()])
      .then(([areas, perfiles, competencias]) => setCatalogs({ areas, perfiles, competencias }))
      .catch(() => setCatalogs({ areas: [], perfiles: [], competencias: [] }));
  }, []);

  const validate = () => {
    if (!question.titulo.trim()) return 'La pregunta debe tener título.';
    if (!question.question_type) return 'Selecciona un tipo de pregunta.';
    if (Number(question.puntaje) <= 0) return 'El puntaje debe ser mayor a cero.';
    if (question.question_type === 'single_choice' && options.filter((option) => option.is_correct).length !== 1) return 'Opción única requiere exactamente una respuesta correcta.';
    if (question.question_type === 'multiple_choice' && options.filter((option) => option.is_correct).length < 1) return 'Opción múltiple requiere al menos una respuesta correcta.';
    if (question.question_type === 'audio_response' && !question.instrucciones.trim()) return 'La pregunta de audio debe tener instrucciones.';
    if (question.question_type === 'spreadsheet') {
      const target = settings.targetCell || settings.targetCells?.[0];
      const expected = settings.expectedAnswers?.[target] || {};
      const gradingMode = expected.gradingMode || settings.gradingMode || 'result';
      if (!question.instrucciones.trim()) return 'Mini hoja requiere instrucciones para el participante.';
      if (!target) return 'Mini hoja requiere celda objetivo.';
      if ((settings.lockedCells || []).includes(target)) return 'La celda objetivo no puede estar bloqueada.';
      if (gradingMode !== 'manual' && gradingMode !== 'formula_exact' && String(expected.expectedValue ?? settings.expectedValue ?? '').trim() === '') return 'Mini hoja requiere resultado esperado.';
      if (gradingMode === 'formula_exact' && !String(expected.expectedFormula || settings.expectedFormula || '').trim()) return 'Mini hoja requiere fórmula esperada.';
    }
    if (question.question_type === 'kpi_numeric' && !Number.isFinite(Number(correctAnswer.expected))) return 'KPI requiere respuesta esperada numérica.';
    return '';
  };

  const save = async () => {
    const error = validate();
    if (error) {
      setStatus({ error, saving: false });
      return;
    }

    setStatus({ error: '', saving: true });
    try {
      const scoringMode = ['long_text', 'audio_response'].includes(question.question_type) ? 'manual' : question.scoring_mode;
      const created = await createQuestion({ ...question, settings, rubric, correct_answer: correctAnswer, scoring_mode: scoringMode });

      if (['single_choice', 'multiple_choice'].includes(question.question_type)) {
        const createdOptions = [];
        for (const [index, option] of options.filter((item) => item.option_text.trim()).entries()) {
          createdOptions.push(await createQuestionOption({ question_id: created.id, option_text: option.option_text, is_correct: option.is_correct, orden: index + 1 }));
        }
        const correctIds = createdOptions.filter((option) => option.is_correct).map((option) => option.id);
        await updateQuestion(created.id, {
          correct_answer: question.question_type === 'single_choice' ? { option_id: correctIds[0] } : { option_ids: correctIds },
        });
      }

      setQuestion({ evaluacion_id: evaluacionId, section_id: '', question_type: '', titulo: '', descripcion: '', instrucciones: '', puntaje: 1, required: true, scoring_mode: 'auto', competencia_id: '', area_id: '', perfil_operativo_id: '', nivel: '' });
      setOptions(initialOptions);
      setSettings({});
      setCorrectAnswer({});
      setRubric({});
      setStatus({ error: '', saving: false });
      onCreated?.();
    } catch (saveError) {
      setStatus({ error: saveError.message, saving: false });
    }
  };

  const previewQuestion = { ...question, settings, rubric, options };

  return (
    <div className="form-card builder-panel">
      <h2>Agregar pregunta</h2>
      <div className="form-grid">
        <label>
          Título
          <input value={question.titulo} onChange={(event) => setQuestion({ ...question, titulo: event.target.value })} />
        </label>
        <QuestionTypeSelector value={question.question_type} onChange={(value) => setQuestion({ ...question, question_type: value })} />
        <label>
          Sección
          <select value={question.section_id || ''} onChange={(event) => setQuestion({ ...question, section_id: event.target.value || null })}>
            <option value="">General</option>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.nombre}</option>)}
          </select>
        </label>
        <label>
          Puntaje
          <input type="number" value={question.puntaje} onChange={(event) => setQuestion({ ...question, puntaje: Number(event.target.value) })} />
        </label>
        <label>
          Competencia
          <select value={question.competencia_id || ''} onChange={(event) => setQuestion({ ...question, competencia_id: event.target.value })}>
            <option value="">Sin competencia</option>
            {catalogs.competencias.map((competencia) => <option key={competencia.id} value={competencia.id}>{competencia.nombre}</option>)}
          </select>
        </label>
        <label>
          Área
          <select value={question.area_id || ''} onChange={(event) => setQuestion({ ...question, area_id: event.target.value })}>
            <option value="">Sin área</option>
            {catalogs.areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
          </select>
        </label>
        <label>
          Perfil operativo
          <select value={question.perfil_operativo_id || ''} onChange={(event) => setQuestion({ ...question, perfil_operativo_id: event.target.value })}>
            <option value="">Sin perfil</option>
            {catalogs.perfiles.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}
          </select>
        </label>
        <label>
          Nivel
          <select value={question.nivel || ''} onChange={(event) => setQuestion({ ...question, nivel: event.target.value })}>
            <option value="">Sin nivel</option>
            <option value="basico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </label>
      </div>
      <label>
        Instrucciones
        <textarea rows="3" value={question.instrucciones} onChange={(event) => setQuestion({ ...question, instrucciones: event.target.value })} />
      </label>

      {['single_choice', 'multiple_choice'].includes(question.question_type) ? <QuestionOptionsEditor type={question.question_type} options={options} setOptions={setOptions} /> : null}
      {question.question_type === 'short_text' ? <RubricEditor value={correctAnswer} onChange={(value) => setCorrectAnswer({ ...correctAnswer, keywords: String(value.criteria || '').split(',').map((item) => item.trim()).filter(Boolean) })} /> : null}
      {question.question_type === 'long_text' ? <RubricEditor value={rubric} onChange={setRubric} /> : null}
      {question.question_type === 'audio_response' ? <AudioQuestionSettings settings={settings} setSettings={setSettings} rubric={rubric} setRubric={setRubric} /> : null}
      {question.question_type === 'spreadsheet' ? (
        <SpreadsheetQuestionSettings
          settings={settings}
          setSettings={setSettings}
          correctAnswer={correctAnswer}
          setCorrectAnswer={setCorrectAnswer}
          puntaje={question.puntaje}
        />
      ) : null}
      {question.question_type === 'kpi_numeric' ? <KpiQuestionSettings correctAnswer={correctAnswer} setCorrectAnswer={setCorrectAnswer} settings={settings} setSettings={setSettings} /> : null}

      {status.error ? <p className="alert error">{status.error}</p> : null}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={() => setPreview((value) => !value)}>Previsualizar pregunta</button>
        <button className="primary-button" type="button" onClick={save} disabled={status.saving}>{status.saving ? 'Guardando...' : 'Guardar pregunta'}</button>
      </div>

      {preview ? (
        <div className="builder-preview">
          <h3>{previewQuestion.titulo || 'Pregunta sin título'}</h3>
          <p>{previewQuestion.instrucciones}</p>
          <QuestionRenderer question={previewQuestion} value={null} onChange={() => {}} />
        </div>
      ) : null}
    </div>
  );
}
