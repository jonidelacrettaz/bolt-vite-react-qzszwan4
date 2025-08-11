const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetRequest {
  mail: string;
}

interface SygematResetResponse {
  success?: boolean;
  token?: string;
  message?: string;
  error?: string;
  // La API de Sygemat puede devolver diferentes estructuras
  [key: string]: any;
}

Deno.serve(async (req: Request) => {
  console.log('Password-reset function called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Processing password reset request');
    const { mail }: PasswordResetRequest = await req.json();
    console.log('Email received for reset:', mail);

    if (!mail) {
      console.log('Missing email');
      return new Response(
        JSON.stringify({ error: "Email es requerido" }),
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
    if (!emailRegex.test(mail)) {
      console.log('Invalid email format');
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Call Sygemat API to generate the reset token
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/RST_PWD_REQ?api_key=f3MM4FeX';
    console.log('Calling Sygemat API to generate reset token');

    let sygematResponse;
    let sygematData: SygematResetResponse;

    try {
      sygematResponse = await fetch(sygemat_api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mail }),
        signal: AbortSignal.timeout(15000), // 15 segundos timeout
      });

      console.log('Sygemat API response status:', sygematResponse.status);
      console.log('Sygemat API response headers:', Object.fromEntries(sygematResponse.headers.entries()));

      if (!sygematResponse.ok) {
        const errorText = await sygematResponse.text();
        console.log('Sygemat API error response:', errorText);
        
        if (sygematResponse.status === 404) {
          return new Response(
            JSON.stringify({ error: "Email no encontrado en el sistema" }),
            {
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }
        
        throw new Error(`Sygemat API error: ${sygematResponse.status} - ${errorText}`);
      }

      const responseText = await sygematResponse.text();
      console.log('Sygemat API raw response:', responseText);

      try {
        sygematData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Sygemat response as JSON:', parseError);
        throw new Error('Respuesta inválida de la API de Sygemat');
      }

    } catch (fetchError) {
      console.error('Error calling Sygemat API:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: "Timeout al conectar con el servidor. Intente nuevamente." }),
          {
            status: 408,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Error al conectar con el servidor de autenticación" }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Sygemat reset response:', sygematData);

    // Check different possible response structures from Sygemat
    let resetToken: string | null = null;
    let isSuccess = false;

    // Try different ways the API might return the token
    if (sygematData.token) {
      resetToken = sygematData.token;
      isSuccess = true;
    } else if (sygematData.success === true && sygematData.token) {
      resetToken = sygematData.token;
      isSuccess = true;
    } else if (sygematData.success !== false) {
      // If success is not explicitly false, check for token in other fields
      for (const key in sygematData) {
        if (typeof sygematData[key] === 'string' && sygematData[key].length > 10) {
          resetToken = sygematData[key];
          isSuccess = true;
          break;
        }
      }
    }

    if (!isSuccess || !resetToken) {
      console.log('Failed to generate reset token or extract token from response');
      return new Response(
        JSON.stringify({ 
          error: sygematData.error || sygematData.message || "Error al generar token de restablecimiento" 
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

    // Build the complete reset URL with token and email
    const baseUrl = 'https://proveedores.sygemat.com.ar';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(mail)}`;
    
    console.log('Generated reset URL:', resetUrl);

    // Call the webhook with the complete URL
    const webhook_url = 'https://hook.us1.make.com/jnj6m9wdvbn3fm8w2sev3e39ds8wp8a7';
    console.log('Calling password reset webhook with complete URL');

    try {
      const webhookResponse = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mail,
          url: resetUrl,
          token: resetToken
        }),
        signal: AbortSignal.timeout(10000), // 10 segundos timeout para webhook
      });

      console.log('Webhook response status:', webhookResponse.status);

      if (!webhookResponse.ok) {
        const webhookError = await webhookResponse.text();
        console.log('Webhook error response:', webhookError);
        throw new Error(`Webhook error: ${webhookResponse.status} - ${webhookError}`);
      }

      const webhookResult = await webhookResponse.text();
      console.log('Webhook success response:', webhookResult);

    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      
      if (webhookError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: "Timeout al enviar el email. El token fue generado, pero el email puede tardar en llegar." }),
          {
            status: 202, // Accepted but may be delayed
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
      
      // Even if webhook fails, we generated the token successfully
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Token generado. Si no recibe el email, puede usar el enlace de restablecimiento manual.',
          token: resetToken // Include token for manual reset option
        }),
        {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Password reset email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de recuperación enviado exitosamente' 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor. Por favor, intente más tarde.'
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