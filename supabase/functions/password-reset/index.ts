const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetRequest {
  mail: string;
}

interface SygematResetResponse {
  success: boolean;
  token?: string;
  message?: string;
  error?: string;
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

    // First, call Sygemat API to generate the reset token
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/RST_PWD_REQ?api_key=f3MM4FeX';
    console.log('Calling Sygemat API to generate reset token');

    const sygematResponse = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mail }),
    });

    console.log('Sygemat API response status:', sygematResponse.status);

    if (!sygematResponse.ok) {
      console.log('Sygemat API error:', sygematResponse.status);
      
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
      
      throw new Error(`Sygemat API error: ${sygematResponse.status}`);
    }

    const sygematData: SygematResetResponse = await sygematResponse.json();
    console.log('Sygemat reset response:', sygematData);

    if (!sygematData.success || !sygematData.token) {
      console.log('Failed to generate reset token');
      return new Response(
        JSON.stringify({ 
          error: sygematData.error || "Error al generar token de restablecimiento" 
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
    const baseUrl = Deno.env.get('SITE_URL') || 'https://proveedores.sygemat.com.ar';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(sygematData.token)}&email=${encodeURIComponent(mail)}`;
    
    console.log('Generated reset URL:', resetUrl);

    // Now call the webhook with the complete URL
    const webhook_url = 'https://hook.us1.make.com/jnj6m9wdvbn3fm8w2sev3e39ds8wp8a7';
    console.log('Calling password reset webhook with complete URL');

    const webhookResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mail,
        url: resetUrl,
        token: sygematData.token
      }),
    });

    console.log('Webhook response status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      console.log('Webhook error:', webhookResponse.status);
      throw new Error(`Webhook error: ${webhookResponse.status}`);
    }

    console.log('Password reset email sent successfully with complete URL');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de recuperación enviado con enlace completo' 
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
        error: 'Error al enviar email de recuperación'
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