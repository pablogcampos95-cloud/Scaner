import Logo from '../components/Logo.jsx';

export default function EvaluationCompleted() {
  return (
    <main className="evaluation-page">
      <section className="evaluation-panel completion-panel">
        <Logo size="md" showText={false} />
        <span className="eyebrow">ScanerIA</span>
        <h1>Evaluación completada</h1>
        <p>Tus respuestas fueron registradas correctamente. El equipo responsable podrá revisar el resultado y las recomendaciones asociadas.</p>
      </section>
    </main>
  );
}
