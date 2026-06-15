import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { getAsignacionByToken, updateAsignacion } from '../services/asignacionesService.js';
import { completePublicEvaluation, getResultadoByAssignment } from '../services/resultadosService.js';
import defaultQuestions from '../data/defaultQuestions.js';
import { ASSIGNMENT_STATUS, MODULES } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import { calculateScores } from '../utils/scoreCalculator.js';

export default function EvaluationPublic() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ assignment: null, loading: true, error: '', started: false, saving: false });
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    getAsignacionByToken(token)
      .then(async (assignment) => {
        const existingResult = await getResultadoByAssignment(assignment.id);
        if (existingResult || assignment.estado === ASSIGNMENT_STATUS.COMPLETADA) {
          setState({ assignment, loading: false, error: 'Esta evaluación ya fue completada.', started: false, saving: false });
          return;
        }
        if (assignment.estado === ASSIGNMENT_STATUS.VENCIDA) {
          setState({ assignment, loading: false, error: 'El enlace de evaluación está vencido.', started: false, saving: false });
          return;
        }
        setState({ assignment, loading: false, error: '', started: assignment.estado === ASSIGNMENT_STATUS.EN_PROCESO, saving: false });
      })
      .catch((error) => setState({ assignment: null, loading: false, error: error.message, started: false, saving: false }));
  }, [token]);

  const groupedQuestions = useMemo(() => {
    return MODULES.map((module) => ({
      ...module,
      questions: defaultQuestions.filter((question) => question.module === module.key),
    }));
  }, []);

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

  const finishEvaluation = async () => {
    if (Object.keys(answers).length !== defaultQuestions.length) {
      setState((prev) => ({ ...prev, error: 'Responde todas las preguntas antes de finalizar.' }));
      return;
    }

    setState((prev) => ({ ...prev, saving: true, error: '' }));
    try {
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
        <section className="evaluation-panel">
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
            <span className="eyebrow">Evaluación pública</span>
            <h1>{state.assignment.evaluaciones?.nombre || 'Diagnóstico operativo y comercial'}</h1>
            <p>{state.assignment.evaluaciones?.descripcion}</p>
          </div>
          <div className="identity-box">
            <strong>{evaluado?.nombre_completo}</strong>
            <span>{evaluado?.dni_codigo}</span>
            <span>Límite: {formatDate(state.assignment.fecha_limite)}</span>
          </div>
        </div>

        {!state.started ? (
          <div className="start-block">
            <p>Valida tus datos antes de iniciar. La evaluación solo puede rendirse una vez.</p>
            <button className="primary-button" type="button" onClick={startEvaluation}>
              Iniciar evaluación
            </button>
          </div>
        ) : (
          <form className="questions-flow" onSubmit={(event) => event.preventDefault()}>
            {groupedQuestions.map((module) => (
              <section className="question-module" key={module.key}>
                <h2>{module.label}</h2>
                {module.questions.map((question, index) => (
                  <fieldset className="question-card" key={question.id}>
                    <legend>
                      {index + 1}. {question.question}
                    </legend>
                    {question.options.map((option) => (
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
                    ))}
                  </fieldset>
                ))}
              </section>
            ))}
            {state.error ? <p className="alert error">{state.error}</p> : null}
            <button className="primary-button" type="button" onClick={finishEvaluation} disabled={state.saving}>
              {state.saving ? 'Guardando resultado...' : 'Finalizar evaluación'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
