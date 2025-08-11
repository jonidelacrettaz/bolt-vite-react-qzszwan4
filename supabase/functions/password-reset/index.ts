const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetRequest {
  mail: string;
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

    // Call webhook directly with the real URL
    const webhook_url = 'https://hook.us1.make.com/jnj6m9wdvbn3fm8w2sev3e39ds8wp8a7';
    console.log('Calling password reset webhook');

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mail,
        url: 'https://proveedores.sygemat.com.ar/reset-password'
      }),
    });

    console.log('Webhook response status:', response.status);

    if (!response.ok) {
      console.log('Webhook error:', response.status);
      throw new Error(`Webhook error: ${response.status}`);
    }

    console.log('Password reset email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Email de recuperación enviado' }),
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