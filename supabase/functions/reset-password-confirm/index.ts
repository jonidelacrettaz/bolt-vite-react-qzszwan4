const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetConfirmRequest {
  email: string;
  token: string;
  newPassword: string;
}

interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  console.log('Reset-password-confirm function called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Processing password reset confirmation');
    const { email, token, newPassword }: PasswordResetConfirmRequest = await req.json();
    console.log('Email received for confirmation:', email);

    if (!email || !token || !newPassword) {
      console.log('Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Email, token y nueva contraseña son requeridos" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Formato de email inválido" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Password validation
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "La contraseña debe tener al menos 8 caracteres" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasNumbers) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "La contraseña debe contener al menos una mayúscula y un número" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Basic token validation (you can enhance this with expiration, etc.)
    if (token.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Token inválido" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Call Sygemat API to change the password
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/CHG_PASS_EML?api_key=f3MM4FeX';
    console.log('Calling Sygemat API to update password');

    const response = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        proveedor: email,
        password: newPassword
      }),
      signal: AbortSignal.timeout(15000),
    });

    console.log('Sygemat API response status:', response.status);

    if (!response.ok) {
      console.log('Sygemat API error:', response.status);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Usuario no encontrado" 
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
      
      throw new Error(`Sygemat API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Password update response:', data);

    // Check if the API returned success (1 = success, 0 = failure)
    if (data !== 1) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "No se pudo actualizar la contraseña. Verifique que el email sea correcto." 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Password updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contraseña actualizada exitosamente' 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    
    let errorMessage = 'Error interno del servidor al actualizar la contraseña';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout al conectar con el servidor. Por favor, intente nuevamente.';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Error de conexión. Por favor, verifique su conexión a internet.';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});