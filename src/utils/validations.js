export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLogin(values) {
  const errors = {};
  if (!values.email) errors.email = 'Ingresa el correo.';
  if (values.email && !isEmail(values.email)) errors.email = 'Ingresa un correo valido.';
  if (!values.password) errors.password = 'Ingresa la contrasena.';
  return errors;
}

export function validateEvaluado(values) {
  const errors = {};
  if (!values.nombre_completo?.trim()) errors.nombre_completo = 'El nombre completo es obligatorio.';
  if (!values.dni_codigo?.trim()) errors.dni_codigo = 'El DNI o codigo es obligatorio.';
  if (!values.correo?.trim()) errors.correo = 'El correo es obligatorio.';
  if (values.correo && !isEmail(values.correo)) errors.correo = 'Ingresa un correo valido.';
  if (!values.area_id) errors.area_id = 'Selecciona un area.';
  if (!values.perfil_operativo_id) errors.perfil_operativo_id = 'Selecciona un perfil operativo.';
  if (!(values.unidad || values.campana)?.trim()) errors.unidad = 'La campana o unidad es obligatoria.';
  return errors;
}

export function validateAssignment(values) {
  const errors = {};
  if (!values.evaluado_id) errors.evaluado_id = 'Selecciona un evaluado.';
  if (!values.evaluacion_id) errors.evaluacion_id = 'Selecciona una evaluacion.';
  if (!values.fecha_limite) errors.fecha_limite = 'Define una fecha limite.';
  return errors;
}
