export function generateToken(prefix = 'eval') {
  const random = crypto.getRandomValues(new Uint32Array(3));
  return `${prefix}_${Date.now().toString(36)}_${Array.from(random)
    .map((part) => part.toString(36))
    .join('')}`;
}
