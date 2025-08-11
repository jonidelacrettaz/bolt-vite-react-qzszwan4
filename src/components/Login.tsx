import React, { useState, useEffect } from 'react';
import { AlertCircle, WifiOff, CheckCircle } from 'lucide-react';
import { isAdminLogin, ADMIN_CREDENTIALS } from '../config/adminCredentials';

interface LoginProps {
  onLogin: (data: { proveedor: number; nombre: string }) => void;
  onShowPasswordReset?: () => void;
}

interface LoginResponse {
  proveedor: number;
  nombre: string;
  Authentico: number;
}

// Simple rate limiting implementation
const useRateLimiter = () => {
  const [attempts, setAttempts] = useState<number>(0);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [blockExpiry, setBlockExpiry] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Max attempts before blocking
  const MAX_ATTEMPTS = 5;
  // Block duration in seconds
  const BLOCK_DURATION = 60;
  // Reset attempts after this many seconds
  const RESET_AFTER = 300; // 5 minutes

  useEffect(() => {
    // Check if there's a stored block in localStorage
    const storedBlockExpiry = localStorage.getItem('loginBlockExpiry');
    if (storedBlockExpiry) {
      const expiry = parseInt(storedBlockExpiry, 10);
      if (expiry > Date.now()) {
        setBlocked(true);
        setBlockExpiry(expiry);
        setCountdown(Math.ceil((expiry - Date.now()) / 1000));
      } else {
        // Block expired, clear it
        localStorage.removeItem('loginBlockExpiry');
        localStorage.removeItem('loginAttempts');
      }
    }

    // Check stored attempts
    const storedAttempts = localStorage.getItem('loginAttempts');
    const storedAttemptsTime = localStorage.getItem('loginAttemptsTime');
    
    if (storedAttempts && storedAttemptsTime) {
      const attemptsTime = parseInt(storedAttemptsTime, 10);
      // If attempts were recorded within the reset window
      if (Date.now() - attemptsTime < RESET_AFTER * 1000) {
        setAttempts(parseInt(storedAttempts, 10));
      } else {
        // Reset attempts if they're old
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginAttemptsTime');
      }
    }
  }, []);

  // Countdown timer for blocked state
  useEffect(() => {
    let timer: number | undefined;
    
    if (blocked && blockExpiry) {
      timer = window.setInterval(() => {
        const remaining = Math.ceil((blockExpiry - Date.now()) / 1000);
        
        if (remaining <= 0) {
          setBlocked(false);
          setBlockExpiry(null);
          setCountdown(0);
          setAttempts(0);
          localStorage.removeItem('loginBlockExpiry');
          localStorage.removeItem('loginAttempts');
          clearInterval(timer);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [blocked, blockExpiry]);

  const recordAttempt = () => {
    if (blocked) return false;
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Store attempts in localStorage
    localStorage.setItem('loginAttempts', newAttempts.toString());
    localStorage.setItem('loginAttemptsTime', Date.now().toString());
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const expiry = Date.now() + BLOCK_DURATION * 1000;
      setBlocked(true);
      setBlockExpiry(expiry);
      setCountdown(BLOCK_DURATION);
      
      // Store block in localStorage
      localStorage.setItem('loginBlockExpiry', expiry.toString());
      
      return false;
    }
    
    return true;
  };

  const resetAttempts = () => {
    setAttempts(0);
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('loginAttemptsTime');
  };

  return { 
    blocked, 
    countdown, 
    attempts, 
    maxAttempts: MAX_ATTEMPTS,
    recordAttempt, 
    resetAttempts 
  };
};

// Image CAPTCHA component
interface CaptchaImage {
  id: number;
  url: string;
  category: string;
  selected: boolean;
}

interface CaptchaProps {
  onVerify: (success: boolean) => void;
}

// Static CAPTCHA images with reliable sources
const captchaImageSets = [
  // Set 1: Animals
  {
    category: 'animals',
    targetImages: [
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop&auto=format', // Dog
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop&auto=format', // Cat
      'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=100&h=100&fit=crop&auto=format', // Turtle
      'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=100&h=100&fit=crop&auto=format', // Bird
    ],
    otherImages: [
      'https://images.unsplash.com/photo-1496412705862-e0088f16f791?w=100&h=100&fit=crop&auto=format', // Mountains
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=100&h=100&fit=crop&auto=format', // Lake
      'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=100&h=100&fit=crop&auto=format', // Landscape
      'https://images.unsplash.com/photo-1560258018-c7db7645254e?w=100&h=100&fit=crop&auto=format', // Building
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=100&h=100&fit=crop&auto=format', // House
    ]
  },
  // Set 2: Cars
  {
    category: 'cars',
    targetImages: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=100&h=100&fit=crop&auto=format', // Car 1
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop&auto=format', // Car 2
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=100&h=100&fit=crop&auto=format', // Car 3
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=100&h=100&fit=crop&auto=format', // Car 4
    ],
    otherImages: [
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=100&h=100&fit=crop&auto=format', // House
      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&auto=format', // Laptop
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=100&h=100&fit=crop&auto=format', // Food
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&h=100&fit=crop&auto=format', // Plate
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop&auto=format', // Mountain
    ]
  },
  // Set 3: Food
  {
    category: 'food',
    targetImages: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100&h=100&fit=crop&auto=format', // Food 1
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop&auto=format', // Food 2
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&h=100&fit=crop&auto=format', // Food 3
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=100&h=100&fit=crop&auto=format', // Food 4
    ],
    otherImages: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=100&fit=crop&auto=format', // Beach
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=100&h=100&fit=crop&auto=format', // Beach 2
      'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=100&h=100&fit=crop&auto=format', // Person
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop&auto=format', // Dog
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop&auto=format', // Car
    ]
  }
];

const ImageCaptcha: React.FC<CaptchaProps> = ({ onVerify }) => {
  const [images, setImages] = useState<CaptchaImage[]>([]);
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  // Generate CAPTCHA images
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setVerified(false);
    setError('');
    
    // Select a random image set
    const randomSetIndex = Math.floor(Math.random() * captchaImageSets.length);
    const selectedSet = captchaImageSets[randomSetIndex];
    
    setTargetCategory(selectedSet.category);
    
    const newImages: CaptchaImage[] = [];
    
    // Add target category images
    selectedSet.targetImages.forEach((url, i) => {
      newImages.push({
        id: i,
        url,
        category: selectedSet.category,
        selected: false
      });
    });
    
    // Add other category images (up to 9 total)
    const otherCount = 9 - selectedSet.targetImages.length;
    
    // Shuffle the other images array
    const shuffledOtherImages = [...selectedSet.otherImages].sort(() => 0.5 - Math.random());
    
    // Take only what we need
    shuffledOtherImages.slice(0, otherCount).forEach((url, i) => {
      newImages.push({
        id: selectedSet.targetImages.length + i,
        url,
        category: 'other',
        selected: false
      });
    });
    
    // Shuffle all images
    const shuffledImages = newImages.sort(() => 0.5 - Math.random());
    
    setImages(shuffledImages);
  };

  const toggleImageSelection = (id: number) => {
    if (verified) return;
    
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const verifyCaptcha = () => {
    setVerifying(true);
    setError('');
    
    // Check if all selected images are from the target category
    // and all target category images are selected
    const selectedImages = images.filter(img => img.selected);
    const targetImages = images.filter(img => img.category === targetCategory);
    
    const allSelectedAreTarget = selectedImages.every(img => img.category === targetCategory);
    const allTargetAreSelected = targetImages.every(img => img.selected);
    
    if (selectedImages.length === 0) {
      setError('Por favor, seleccione al menos una imagen.');
      setVerifying(false);
      return;
    }
    
    // Simulate verification delay
    setTimeout(() => {
      if (allSelectedAreTarget && allTargetAreSelected) {
        setVerified(true);
        onVerify(true);
      } else {
        setError('Verificación fallida. Por favor, intente nuevamente.');
        generateCaptcha();
        onVerify(false);
      }
      setVerifying(false);
    }, 1000);
  };

  // Translate category names to Spanish
  const translateCategory = (category: string): string => {
    switch (category) {
      case 'animals': return 'animales';
      case 'cars': return 'autos';
      case 'food': return 'comida';
      default: return category;
    }
  };

  return (
    <div className="captcha-container">
      <div className="captcha-header">
        <h3 className="captcha-title">Verificación de seguridad</h3>
        <p className="captcha-instruction">
          Seleccione todas las imágenes que contengan <strong>{translateCategory(targetCategory)}</strong>
        </p>
      </div>
      
      {error && (
        <div className="captcha-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {verified ? (
        <div className="captcha-success">
          <CheckCircle size={20} />
          <span>Verificación exitosa</span>
        </div>
      ) : (
        <>
          <div className="captcha-grid">
            {images.map(image => (
              <div 
                key={image.id}
                className={`captcha-image-container ${image.selected ? 'selected' : ''}`}
                onClick={() => toggleImageSelection(image.id)}
              >
                <div className="captcha-image">
                  <img src={image.url} alt={`CAPTCHA image ${image.id}`} />
                  {image.selected && (
                    <div className="captcha-image-selected">
                      <CheckCircle size={24} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="captcha-actions">
            <button 
              type="button" 
              className="captcha-refresh-button"
              onClick={generateCaptcha}
              disabled={verifying}
            >
              Cambiar imágenes
            </button>
            <button 
              type="button" 
              className="captcha-verify-button"
              onClick={verifyCaptcha}
              disabled={verifying}
            >
              {verifying ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin, onShowPasswordReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  
  const { 
    blocked, 
    countdown, 
    attempts, 
    maxAttempts,
    recordAttempt, 
    resetAttempts 
  } = useRateLimiter();

  // Show CAPTCHA after first attempt or if there are stored attempts
  useEffect(() => {
    if (attempts > 0) {
      setShowCaptcha(true);
    }
  }, [attempts]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCaptchaVerify = (success: boolean) => {
    setCaptchaVerified(success);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setResetError('Por favor, ingrese su correo electrónico primero.');
      return;
    }

    // Don't allow password reset for admin
    if (email === 'admin') {
      setResetError('No se puede restablecer la contraseña del administrador.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResetError('Por favor, ingrese un correo electrónico válido.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mail: email }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      setResetSuccess(true);
      setShowPasswordReset(false);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setResetSuccess(false);
      }, 5000);

    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Error al enviar el correo de recuperación.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.';
      } else if (error.message.includes('fetch') || !navigator.onLine) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
      } else if (error.message.includes('servidor')) {
        errorMessage = 'Error del servidor. Por favor, intente más tarde.';
      }
      
      setResetError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOffline) {
      setError('No hay conexión a internet. Por favor, verifique su conexión.');
      return;
    }

    // Basic validation
    if (!email || !password) {
      setError('Por favor, ingrese su correo electrónico y contraseña.');
      return;
    }
    
    // Email format validation
    // Skip email validation for admin login
    if (email !== 'admin') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Por favor, ingrese un correo electrónico válido.');
        return;
      }
    }
    
    // If we're showing CAPTCHA and it's not verified, show error
    if (showCaptcha && !captchaVerified) {
      setError('Por favor, complete la verificación de seguridad.');
      return;
    }
    
    // Check if rate limited
    if (blocked) {
      setError(`Demasiados intentos fallidos. Por favor, espere ${countdown} segundos antes de intentar nuevamente.`);
      return;
    }
    
    setLoading(true);
    setError('');
    setConnectionError(null);

    // Check for admin login first
    if (isAdminLogin(email, password)) {
      resetAttempts();
      onLogin({ 
        proveedor: ADMIN_CREDENTIALS.providerId, 
        nombre: ADMIN_CREDENTIALS.providerName 
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (typeof data.proveedor === 'undefined' || typeof data.nombre === 'undefined' || typeof data.Authentico === 'undefined') {
        throw new Error('Respuesta del servidor inválida');
      }

      // Check if authentication was successful
      if (data.Authentico === 1) {
        resetAttempts();
        onLogin({ proveedor: data.proveedor, nombre: data.nombre });
      } else {
        // Authentication failed - show password reset option
        throw new Error('Credenciales incorrectas');
      }
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Error al iniciar sesión.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La conexión tardó demasiado tiempo. Por favor, intente nuevamente.';
        setConnectionError('timeout');
      } else if (error.message.includes('fetch') || !navigator.onLine) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
        setConnectionError('network');
      } else if (error.message.includes('servidor')) {
        errorMessage = `Error del servidor. Por favor, intente más tarde.`;
        setConnectionError('server');
      } else if (error.message === 'Respuesta del servidor inválida' || error.message === 'Datos de usuario incompletos') {
        errorMessage = 'Error en la respuesta del servidor. Por favor, intente más tarde.';
        setConnectionError('invalid');
      } else if (error.message === 'Credenciales incorrectas') {
        errorMessage = 'Credenciales incorrectas. Por favor, verifique su correo electrónico y contraseña.';
        if (onShowPasswordReset) {
          setShowPasswordReset(true);
        }
      } else if (error.message === 'INVALID_CREDENTIALS') {
        errorMessage = 'Error inesperado. Por favor, intente nuevamente.';
        if (onShowPasswordReset) {
          setShowPasswordReset(true);
        }
      } else {
        errorMessage = 'Error inesperado. Por favor, intente nuevamente.';
      }
      
      setError(errorMessage);
      setCaptchaVerified(false);
      
      if (connectionError || error.message === 'INVALID_CREDENTIALS') {
        // Si es un error de conexión, no contar como intento fallido
        return;
      }
      
      // Record this attempt, if it returns false we're now blocked
      if (!recordAttempt()) {
        setError(`Demasiados intentos fallidos. Por favor, espere ${countdown} segundos antes de intentar nuevamente.`);
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <h2 className="login-title">
            Portal de Proveedores
          </h2>
          <p className="login-subtitle">
            Ingrese sus credenciales para acceder
          </p>
        </div>
        
        {resetSuccess && (
          <div className="login-success">
            <div className="flex items-center">
              <CheckCircle size={16} className="mr-2" />
              <p className="login-success-text">
                Se ha enviado un correo con las instrucciones para restablecer su contraseña.
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className={`login-error ${connectionError ? 'connection-error' : ''}`}>
            <div className="flex items-center">
              {connectionError ? (
                <WifiOff size={16} className="mr-2" />
              ) : (
                <AlertCircle size={16} className="mr-2" />
              )}
              <p className="login-error-text">{error}</p>
            </div>
          </div>
        )}
        
        {showPasswordReset && (
          <PasswordResetSection 
            onReset={handlePasswordReset} 
            loading={resetLoading} 
            error={resetError}
            onShowFullReset={onShowPasswordReset}
          />
        )}
        
        {blocked ? (
          <div className="blocked-message">
            <p className="text-center text-gray-700 my-4">
              Demasiados intentos fallidos. Por favor, espere <span className="font-bold">{countdown}</span> segundos antes de intentar nuevamente.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-secondary h-2.5 rounded-full" 
                style={{ width: `${(countdown / 60) * 100}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {attempts > 0 && (
              <div className="attempts-warning">
                Intentos: {attempts}/{maxAttempts}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="email-address" className="form-label">
                  Correo electrónico
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="form-input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {showCaptcha && (
              <div className="mt-6">
                <ImageCaptcha onVerify={handleCaptchaVerify} />
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || blocked || (showCaptcha && !captchaVerified)}
                className="form-button"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface PasswordResetSectionProps {
  onReset: () => void;
  loading: boolean;
  error: string;
  onShowFullReset?: () => void;
}

const PasswordResetSection: React.FC<PasswordResetSectionProps> = ({ 
  onReset, 
  loading, 
  error, 
  onShowFullReset 
}) => {
  return (
    <div className="password-reset-section">
      <div className="password-reset-header">
        <h3 className="password-reset-title">¿Olvidó su contraseña?</h3>
        <p className="password-reset-description">
          Puede solicitar un correo de recuperación o ir directamente a la página de restablecimiento si ya tiene un token.
        </p>
      </div>
      
      {error && (
        <div className="password-reset-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="password-reset-button"
        >
          {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
        </button>
        
        {onShowFullReset && (
          <button
            type="button"
            onClick={onShowFullReset}
            className="w-full text-center text-sm text-secondary hover:underline py-2"
          >
            ¿Ya tiene un token? Haga clic aquí
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;