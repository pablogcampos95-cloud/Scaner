import AudioRecorder from './AudioRecorder.jsx';
import KpiQuestion from './KpiQuestion.jsx';
import MultipleChoiceQuestion from './MultipleChoiceQuestion.jsx';
import SingleChoiceQuestion from './SingleChoiceQuestion.jsx';
import TextQuestion from './TextQuestion.jsx';
import SpreadsheetQuestionRunner from '../spreadsheet/SpreadsheetQuestionRunner.jsx';

export default function QuestionRenderer({ question, value, onChange }) {
  if (question.question_type === 'single_choice') return <SingleChoiceQuestion question={question} value={value} onChange={onChange} />;
  if (question.question_type === 'multiple_choice') return <MultipleChoiceQuestion question={question} value={value || []} onChange={onChange} />;
  if (question.question_type === 'short_text' || question.question_type === 'long_text') return <TextQuestion question={question} value={value || ''} onChange={onChange} />;
  if (question.question_type === 'audio_response') return <AudioRecorder value={value} onChange={onChange} maxSeconds={question.settings?.maxSeconds} />;
  if (question.question_type === 'spreadsheet') return <SpreadsheetQuestionRunner question={question} value={value} onChange={onChange} />;
  if (question.question_type === 'kpi_numeric') return <KpiQuestion question={question} value={value} onChange={onChange} />;
  return <p className="alert error">Tipo de pregunta no soportado: {question.question_type}</p>;
}
