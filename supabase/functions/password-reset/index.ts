const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PasswordResetRequest {
  mail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { mail }: PasswordResetRequest = await req.json();

    if (!mail) {
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

    // Call webhook - URL is hidden on server side
    const webhook_url = Deno.env.get('SYGEMAT_PASSWORD_RESET_WEBHOOK');
    
    if (!webhook_url) {
      throw new Error('Webhook URL not configured');
    }

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

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }

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