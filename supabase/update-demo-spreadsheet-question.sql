update public.questions
set
  titulo = 'Completa las formulas de sumar, restar, multiplicar y dividir.',
  descripcion = 'Usa las columnas B y C para calcular cada resultado en la columna D.',
  instrucciones = 'En D2 escribe =B2+C2, en D3 escribe =B3-C3, en D4 escribe =B4*C4 y en D5 escribe =B5/C5.',
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
    'targetCell', 'D2',
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
      'E1', 'Guia',
      'A2', 'Sumar',
      'B2', '120',
      'C2', '18',
      'E2', '=B2+C2',
      'A3', 'Restar',
      'B3', '120',
      'C3', '18',
      'E3', '=B3-C3',
      'A4', 'Multiplicar',
      'B4', '12',
      'C4', '3',
      'E4', '=B4*C4',
      'A5', 'Dividir',
      'B5', '120',
      'C5', '18',
      'E5', '=B5/C5'
    )
  ),
  updated_at = now()
where id = 'ea57d4f6-a4a9-45ad-b72a-76e05066cf8a';
