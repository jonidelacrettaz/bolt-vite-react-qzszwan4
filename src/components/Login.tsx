import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (data: { proveedor: number; nombre: string }) => void;
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

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
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

  const handleCaptchaVerify = (success: boolean) => {
    setCaptchaVerified(success);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if rate limited
    if (blocked) {
      setError(`Demasiados intentos fallidos. Por favor, espere ${countdown} segundos antes de intentar nuevamente.`);
      return;
    }
    
    // If we're showing CAPTCHA and it's not verified, show error
    if (showCaptcha && !captchaVerified) {
      setError('Por favor, complete la verificación de seguridad.');
      return;
    }
    
    // Basic validation
    if (!email || !password) {
      setError('Por favor, ingrese su correo electrónico y contraseña.');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingrese un correo electrónico válido.');
      return;
    }
    
    // Record this attempt, if it returns false we're now blocked
    if (!recordAttempt()) {
      setError(`Demasiados intentos fallidos. Por favor, espere ${countdown} segundos antes de intentar nuevamente.`);
      return;
    }
    
    // Show CAPTCHA for next attempt
    setShowCaptcha(true);
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        'https://www.sygemat.com.ar/api-prod/Sygemat_Dat_dat/v1/_process/INI_URS_VRF_3P_DAT?api_key=f3MM4FeX',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if the response contains an error message
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Check if the response has the expected data structure
      if (!data.proveedor || !data.nombre) {
        throw new Error('Respuesta del servidor inválida');
      }

      // Reset attempts on successful login
      resetAttempts();
      onLogin(data);
    } catch (err) {
      let errorMessage = 'Error al iniciar sesión. Por favor, intente nuevamente más tarde.';
      
      if (err instanceof Error) {
        // Log the actual error for debugging but show a user-friendly message
        console.error('Login error:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        
        if (err.message.includes('fetch') || err.message.includes('HTTP error')) {
          errorMessage = 'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.';
        } else if (err.message === 'Respuesta del servidor inválida') {
          errorMessage = 'Error en la respuesta del servidor. Por favor, intente nuevamente más tarde.';
        } else {
          errorMessage = 'Credenciales incorrectas. Por favor, verifique su correo electrónico y contraseña.';
        }
      }
      
      setError(errorMessage);
      // Reset CAPTCHA verification on error
      setCaptchaVerified(false);
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
        
        {error && (
          <div className="login-error">
            <div className="flex">
              <div className="ml-3">
                <p className="login-error-text">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {blocked ? (
          <div className="blocked-message">
            <p className="text-center text-center text-gray-700 my-4">
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
              <div className="attempts-warning text-sm text-gray-600 mb-4">
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
                  type="email"
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

export default Login;