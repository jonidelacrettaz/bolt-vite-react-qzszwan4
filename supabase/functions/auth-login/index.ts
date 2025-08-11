const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  proveedor: number;
  nombre: string;
  Authentico: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email y contraseña son requeridos" }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Call Sygemat API - URL is hidden on server side
    const sygemat_api_url = Deno.env.get('SYGEMAT_LOGIN_API_URL');
    
    if (!sygemat_api_url) {
      throw new Error('API URL not configured');
    }

    const response = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Sygemat API error: ${response.status}`);
    }

    const data: LoginResponse = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        proveedor: 0,
        nombre: '',
        Authentico: 0
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