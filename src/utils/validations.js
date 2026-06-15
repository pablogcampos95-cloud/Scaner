export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLogin(values) {
  const errors = {};
  if (!values.email) errors.email = 'Ingresa el correo.';
  if (values.email && !isEmail(values.email)) errors.email = 'Ingresa un correo válido.';
  if (!values.password) errors.password = 'Ingresa la contraseña.';
  return errors;
}

export function validateEvaluado(values) {
  const errors = {};
  if (!values.nombre_completo?.trim()) errors.nombre_completo = 'El nombre completo es obligatorio.';
  if (!values.dni_codigo?.trim()) errors.dni_codigo = 'El DNI o código es obligatorio.';
  if (!values.correo?.trim()) errors.correo = 'El correo es obligatorio.';
  if (values.correo && !isEmail(values.correo)) errors.correo = 'Ingresa un correo válido.';
  if (!values.campana?.trim()) errors.campana = 'La campaña es obligatoria.';
  if (!values.cargo?.trim()) errors.cargo = 'El cargo es obligatorio.';
  return errors;
}

export function validateAssignment(values) {
  const errors = {};
  if (!values.evaluado_id) errors.evaluado_id = 'Selecciona un evaluado.';
  if (!values.evaluacion_id) errors.evaluacion_id = 'Selecciona una evaluación.';
  if (!values.fecha_limite) errors.fecha_limite = 'Define una fecha límite.';
  return errors;
}
