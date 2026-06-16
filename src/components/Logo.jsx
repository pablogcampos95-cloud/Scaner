import { useState } from 'react';

const sizeClass = {
  sm: 'logo--sm',
  md: 'logo--md',
  lg: 'logo--lg',
};

export default function Logo({ size = 'md', showText = true, className = '' }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`logo ${sizeClass[size] || sizeClass.md} ${className}`}>
      {!failed ? (
        <img src="/assets/logo.png" alt="IA Learning Solutions" onError={() => setFailed(true)} />
      ) : (
        <span className="logo-fallback">Diagnóstico Comercial</span>
      )}
      {showText ? (
        <span className="logo-copy">
          <strong>Diagnóstico Comercial</strong>
          <small>Competencias Operativas</small>
        </span>
      ) : null}
    </div>
  );
}
