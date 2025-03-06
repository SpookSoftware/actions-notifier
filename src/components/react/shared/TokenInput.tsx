import React, { useState } from 'react';

interface TokenInputProps {
  token: string;
  onTokenChange: (token: string) => void;
  onValidate: (token: string) => Promise<boolean>;
  isValidating: boolean;
  isValid: boolean | null;
  errorMessage?: string;
  placeholder?: string;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  token,
  onTokenChange,
  onValidate,
  isValidating,
  isValid,
  errorMessage,
  placeholder = 'Enter your GitHub token',
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleValidate = async () => {
    if (token) {
      await onValidate(token);
    }
  };

  return (
    <div className="token-input-container">
      <div className="token-input-wrapper">
        <input
          type={isPasswordVisible ? 'text' : 'password'}
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          onBlur={handleValidate}
          placeholder={placeholder}
          className={`token-input ${isValid === false ? 'error' : ''}`}
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          className="toggle-password-visibility"
        >
          {isPasswordVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      {isValidating && <div className="token-validating">Validating token...</div>}
      {isValid === false && errorMessage && (
        <div className="token-error">{errorMessage}</div>
      )}
    </div>
  );
};