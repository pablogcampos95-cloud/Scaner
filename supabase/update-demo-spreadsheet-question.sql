update public.questions
set
  titulo = 'Resuelve los ejercicios.',
  descripcion = '',
  instrucciones = '',
  correct_answer = jsonb_build_object(
    'expectedCells', jsonb_build_object(
      'D2', '138',
      'D3', '102',
      'D4', '36',
      'D5', '6.67'
    ),
    'tolerance', 0.01
  ),
  settings = jsonb_build_object(
    'rows', 8,
    'columns', 4,
    'targetCell', 'D2',
    'targetCells', jsonb_build_array('D2', 'D3', 'D4', 'D5'),
    'editableCells', jsonb_build_array('D2', 'D3', 'D4', 'D5'),
    'expectedValue', '138',
    'expectedCells', jsonb_build_object(
      'D2', '138',
      'D3', '102',
      'D4', '36',
      'D5', '6.67'
    ),
    'tolerance', 0.01,
    'reviewOnMismatch', true,
    'initialCells', jsonb_build_object(
      'A1', 'Operacion',
      'B1', 'Valor 1',
      'C1', 'Valor 2',
      'D1', 'Formula / resultado',
      'A2', 'Sumar',
      'B2', '120',
      'C2', '18',
      'A3', 'Restar',
      'B3', '120',
      'C3', '18',
      'A4', 'Multiplicar',
      'B4', '12',
      'C4', '3',
      'A5', 'Dividir',
      'B5', '120',
      'C5', '18'
    )
  ),
  updated_at = now()
where id = 'ea57d4f6-a4a9-45ad-b72a-76e05066cf8a';
