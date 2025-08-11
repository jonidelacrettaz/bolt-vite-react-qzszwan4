const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetRequest {
  mail: string;
}

// Generate a secure random token
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }
  
  return token;
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

    // Generate unique token locally
    const resetToken = generateResetToken();
    console.log('Generated reset token:', resetToken.substring(0, 8) + '...');

    // Get the current domain from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Build the complete reset URL with token and email
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(mail)}`;
    
    console.log('Generated reset URL:', resetUrl);

    // Call the webhook with the complete URL
    const webhook_url = 'https://hook.us1.make.com/jnj6m9wdvbn3fm8w2sev3e39ds8wp8a7';
    console.log('Calling password reset webhook');

    try {
      const webhookResponse = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mail,
          url: resetUrl
        }),
        signal: AbortSignal.timeout(10000),
      });

      console.log('Webhook response status:', webhookResponse.status);

      if (!webhookResponse.ok) {
        const webhookError = await webhookResponse.text();
        console.log('Webhook error response:', webhookError);
        throw new Error(`Webhook error: ${webhookResponse.status}`);
      }

      const webhookResult = await webhookResponse.text();
      console.log('Webhook success response:', webhookResult);

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

    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      
      if (webhookError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            error: "Timeout al enviar el email. Por favor, intente nuevamente." 
          }),
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
        JSON.stringify({ 
          error: "Error al enviar el email de recuperación. Por favor, intente más tarde." 
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