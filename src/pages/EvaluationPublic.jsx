import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import Logo from '../components/Logo.jsx';
import QuestionRenderer from '../components/evaluation-runner/QuestionRenderer.jsx';
import { getAsignacionByToken, updateAsignacion } from '../services/asignacionesService.js';
import { getPublicEvaluationByToken } from '../services/evaluacionesService.js';
import { saveDynamicEvaluationResponses } from '../services/respuestasService.js';
import { completePublicEvaluation, getResultadoByAssignment } from '../services/resultadosService.js';
import defaultQuestions from '../data/defaultQuestions.js';
import { ASSIGNMENT_STATUS, MODULES } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import { calculateScores } from '../utils/scoreCalculator.js';

export default function EvaluationPublic() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ assignment: null, evaluation: null, scoringEvaluation: null, loading: true, error: '', started: false, saving: false });
  const [answers, setAnswers] = useState({});
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  useEffect(() => {
    getPublicEvaluationByToken(token)
      .then(async ({ assignment, evaluation, scoringEvaluation }) => {
        const existingResult = await getResultadoByAssignment(assignment.id);
        if (existingResult || assignment.estado === ASSIGNMENT_STATUS.COMPLETADA) {
          setState({ assignment, evaluation, scoringEvaluation, loading: false, error: 'Esta evaluación ya fue completada.', started: false, saving: false });
          return;
        }
        if (assignment.estado === ASSIGNMENT_STATUS.VENCIDA) {
          setState({ assignment, evaluation, scoringEvaluation, loading: false, error: 'El enlace de evaluación está vencido.', started: false, saving: false });
          return;
        }
        setState({ assignment, evaluation, scoringEvaluation, loading: false, error: '', started: assignment.estado === ASSIGNMENT_STATUS.EN_PROCESO, saving: false });
      })
      .catch(async () => {
        try {
          const assignment = await getAsignacionByToken(token);
          setState({ assignment, evaluation: null, scoringEvaluation: null, loading: false, error: '', started: assignment.estado === ASSIGNMENT_STATUS.EN_PROCESO, saving: false });
        } catch (error) {
          setState({ assignment: null, evaluation: null, scoringEvaluation: null, loading: false, error: error.message, started: false, saving: false });
        }
      });
  }, [token]);

  const dynamicQuestions = state.evaluation?.questions || [];
  const hasDynamicQuestions = dynamicQuestions.length > 0;
  const activeQuestions = hasDynamicQuestions ? dynamicQuestions : defaultQuestions;
  const totalQuestions = activeQuestions.length;

  const groupedQuestions = useMemo(() => {
    if (hasDynamicQuestions) {
      const sections = state.evaluation?.sections?.length
        ? state.evaluation.sections
        : [{ id: 'general', nombre: 'Diagnóstico dinámico', descripcion: '' }];
      return sections.map((section) => ({
        key: section.id,
        label: section.nombre,
        questions: dynamicQuestions.filter((question) => (question.section_id || 'general') === section.id || (!question.section_id && section.id === 'general')),
      })).filter((section) => section.questions.length > 0);
    }

    return MODULES.map((module) => ({
      ...module,
      questions: defaultQuestions.filter((question) => question.module === module.key),
    }));
  }, [dynamicQuestions, hasDynamicQuestions, state.evaluation]);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);
  const currentModule = groupedQuestions[currentModuleIndex];
  const isLastModule = currentModuleIndex === groupedQuestions.length - 1;

  const startEvaluation = async () => {
    try {
      await updateAsignacion(state.assignment.id, {
        estado: ASSIGNMENT_STATUS.EN_PROCESO,
        fecha_inicio: state.assignment.fecha_inicio || new Date().toISOString(),
      });
      setState((prev) => ({ ...prev, started: true }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  };

  const handleAnswer = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const getQuestionTitle = (question) => {
    return question.titulo || question.question || question.title || 'Pregunta sin título';
  };

  const finishEvaluation = async () => {
    if (Object.keys(answers).length !== totalQuestions) {
      setState((prev) => ({ ...prev, error: 'Responde todas las preguntas antes de finalizar.' }));
      return;
    }

    setState((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      if (hasDynamicQuestions) {
        await saveDynamicEvaluationResponses({
          assignment: state.assignment,
          evaluation: state.scoringEvaluation || state.evaluation,
          answers,
        });
        navigate('/evaluacion-completada', { replace: true });
        return;
      }

      const scores = calculateScores(defaultQuestions, answers);
      await completePublicEvaluation({
        asignacion_id: state.assignment.id,
        evaluado_id: state.assignment.evaluado_id,
        supervisor_id: state.assignment.supervisor_id,
        puntaje_pc: scores.puntaje_pc,
        puntaje_excel: scores.puntaje_excel,
        puntaje_etica: scores.puntaje_etica,
        puntaje_kpis: scores.puntaje_kpis,
        promedio_general: scores.promedio_general,
        resultado_final: scores.resultado_final,
        diagnostico: scores.diagnostico,
        recomendacion: scores.recomendacion,
      });
      navigate('/evaluacion-completada', { replace: true });
    } catch (error) {
      setState((prev) => ({ ...prev, saving: false, error: error.message }));
    }
  };

  if (state.loading) return <Loading message="Validando enlace de evaluación..." />;

  if (state.error && !state.started) {
    return (
      <main className="evaluation-page">
        <section className="evaluation-panel completion-panel">
          <Logo size="md" showText={false} />
          <h1>No es posible iniciar la evaluación</h1>
          <p className="alert error">{state.error}</p>
        </section>
      </main>
    );
  }

  const evaluado = state.assignment.evaluados;

  return (
    <main className="evaluation-page">
      <section className="evaluation-panel">
        <div className="evaluation-header">
          <div>
            <Logo size="md" showText={false} />
            <span className="eyebrow">Evaluación pública</span>
            <h1>Diagnóstico de Competencias Operativas y Comerciales</h1>
            <p>
              Esta evaluación permitirá validar conocimientos clave para el desempeño en entornos comerciales, BPO, contact center y back office.
            </p>
          </div>
          <div className="identity-box">
            <strong>{evaluado?.nombre_completo}</strong>
            <span>{state.assignment.evaluaciones?.nombre || 'Diagnóstico asignado'}</span>
            <span>Límite: {formatDate(state.assignment.fecha_limite)}</span>
          </div>
        </div>

        {!state.started ? (
          <div className="start-block">
            <div className="module-pills">
              <span>Habilidades de PC</span>
              <span>Excel</span>
              <span>Ética comercial</span>
              <span>KPIs</span>
            </div>
            <p className="confidential-note">
              Responde de manera individual y honesta. Los resultados serán utilizados con fines de diagnóstico, formación y seguimiento interno.
            </p>
            <button className="primary-button" type="button" onClick={startEvaluation}>
              Iniciar diagnóstico
            </button>
          </div>
        ) : (
          <form className="questions-flow" onSubmit={(event) => event.preventDefault()}>
            <div className="progress-card">
              <div>
              <span>Avance del diagnóstico</span>
                <strong>{answeredCount} / {totalQuestions}</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>{progress}% completado</small>
            </div>

            <section className="question-module">
              <div className="module-heading">
                <span>Módulo {currentModuleIndex + 1} de {groupedQuestions.length}</span>
                <h2>{currentModule.label}</h2>
              </div>
              {currentModule.questions.map((question, index) => (
                <fieldset className="question-card" key={question.id}>
                  <legend>
                    {index + 1}. {getQuestionTitle(question)}
                  </legend>
                  {question.descripcion ? <p className="question-description">{question.descripcion}</p> : null}
                  {question.instrucciones ? <p className="question-instructions">{question.instrucciones}</p> : null}
                  {hasDynamicQuestions ? (
                    <QuestionRenderer question={question} value={answers[question.id]} onChange={(value) => handleAnswer(question.id, value)} />
                  ) : (
                    question.options.map((option) => (
                      <label className="option-row" key={option}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={() => handleAnswer(question.id, option)}
                        />
                        {option}
                      </label>
                    ))
                  )}
                </fieldset>
              ))}
            </section>

            {state.error ? <p className="alert error">{state.error}</p> : null}

            <div className="evaluation-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setCurrentModuleIndex((index) => Math.max(index - 1, 0))}
                disabled={currentModuleIndex === 0}
              >
                Anterior
              </button>
              {!isLastModule ? (
                <button className="primary-button" type="button" onClick={() => setCurrentModuleIndex((index) => index + 1)}>
                  Siguiente
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={finishEvaluation} disabled={state.saving}>
                  {state.saving ? 'Guardando resultado...' : 'Finalizar diagnóstico'}
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
