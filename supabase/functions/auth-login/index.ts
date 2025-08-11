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
  console.log('Auth-login function called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Processing login request');
    const { email, password }: LoginRequest = await req.json();
    console.log('Email received:', email);

    if (!email || !password) {
      console.log('Missing email or password');
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

    // Call Sygemat API directly with the real URL
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/INI_URS_VRF_3P_DAT?api_key=f3MM4FeX';
    console.log('Calling Sygemat API for login');

    const response = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Sygemat API response status:', response.status);

    if (!response.ok) {
      console.log('Sygemat API error:', response.status);
      throw new Error(`Sygemat API error: ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    console.log('Login response received:', data);

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