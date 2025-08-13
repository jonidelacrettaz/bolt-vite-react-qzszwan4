import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

interface PasswordResetResponse {
  success: boolean;
  message: string;
  error?: string;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'token' | 'password'>('token');

  // Get token from URL parameters if available
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlEmail = urlParams.get('email');
    
    if (urlToken) {
      setToken(urlToken);
      if (urlEmail) {
        setEmail(decodeURIComponent(urlEmail));
        setStep('password');
      }
    }
  }, []);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Debe contener al menos un carácter especial');
    }
    
    return errors;
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !email) {
      setError('Por favor, ingrese el token y su correo electrónico.');
      return;
    }
    
    // Validate token format (basic validation)
    if (token.length < 10) {
      setError('El token ingresado no es válido.');
      return;
    }
    
    setStep('password');
    setError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Por favor, complete todos los campos.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('. '));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            token,
            newPassword
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data: PasswordResetResponse = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          onBack();
        }, 3000);
      } else {
        throw new Error(data.error || 'Error al restablecer la contraseña');
      }
      
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Error al restablecer la contraseña.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.';
      } else if (error.message.includes('fetch') || !navigator.onLine) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
      } else if (error.message.includes('servidor')) {
        errorMessage = 'Error del servidor. Por favor, intente más tarde.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-form-container">
          <div className="login-logo-container">
            <img 
              src="https://img.sygemat.com.ar/Imagenes/logo_positivo.png" 
              alt="Sygemat Logo" 
              className="login-logo" 
            />
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h2 className="login-title">¡Contraseña actualizada!</h2>
            <p className="login-subtitle mb-6">
              Su contraseña ha sido restablecida exitosamente.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Será redirigido al inicio de sesión en unos segundos...
            </p>
            <button
              onClick={onBack}
              className="form-button"
            >
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-container">
        <div className="login-logo-container">
          <img 
            src="https://img.sygemat.com.ar/Imagenes/logo_positivo.png" 
            alt="Sygemat Logo" 
            className="login-logo" 
          />
        </div>
        
        <div className="mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-secondary transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio de sesión
          </button>
        </div>
        
        <div>
          <h2 className="login-title">
            {step === 'token' ? 'Verificar Token' : 'Nueva Contraseña'}
          </h2>
          <p className="login-subtitle">
            {step === 'token' 
              ? 'Ingrese el token que recibió por correo electrónico'
              : 'Ingrese su nueva contraseña'
            }
          </p>
        </div>
        
        {error && (
          <div className="login-error">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <p className="login-error-text">{error}</p>
            </div>
          </div>
        )}
        
        {step === 'token' ? (
          <form className="login-form" onSubmit={handleTokenSubmit}>
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="su-email@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="token" className="form-label">
                  Token de verificación
                </label>
                <input
                  id="token"
                  name="token"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ingrese el token recibido por email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Revise su bandeja de entrada y carpeta de spam
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="form-button"
              >
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="form-input pr-10"
                    placeholder="Ingrese su nueva contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} className="text-gray-400" />
                    ) : (
                      <Eye size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="form-input pr-10"
                    placeholder="Confirme su nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} className="text-gray-400" />
                    ) : (
                      <Eye size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 mb-2">La contraseña debe contener:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Al menos 8 caracteres
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Una letra mayúscula
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Una letra minúscula
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${/\d/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Un número
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Un carácter especial
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="form-button"
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordReset;