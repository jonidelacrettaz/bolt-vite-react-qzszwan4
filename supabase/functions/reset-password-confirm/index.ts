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

    // Call Sygemat API to confirm password reset
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/RST_PWD_CNF?api_key=f3MM4FeX';
    console.log('Calling Sygemat API for password reset confirmation');

    const response = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email,
        token,
        newPassword
      }),
    });

    console.log('Sygemat API response status:', response.status);

    if (!response.ok) {
      console.log('Sygemat API error:', response.status);
      
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Token inválido o expirado" 
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
      
      throw new Error(`Sygemat API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Password reset confirmation response:', data);

    // Check if the API returned success
    if (data.success === false) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: data.message || "Error al restablecer la contraseña" 
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

    console.log('Password reset successful');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contraseña restablecida exitosamente' 
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
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Error interno del servidor al restablecer la contraseña'
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