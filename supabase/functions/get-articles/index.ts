const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ArticlesRequest {
  proveedor: number;
}

Deno.serve(async (req: Request) => {
  console.log('Get-articles function called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Processing articles request');
    const { proveedor }: ArticlesRequest = await req.json();
    console.log('Proveedor ID received:', proveedor);

    if (!proveedor) {
      console.log('Missing proveedor ID');
      return new Response(
        JSON.stringify({ error: "ID de proveedor es requerido" }),
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
    const sygemat_api_url = 'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/_process/JSON_PRV?api_key=f3MM4FeX';
    console.log('Calling Sygemat API for articles');

    const response = await fetch(sygemat_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proveedor }),
    });

    console.log('Sygemat API response status:', response.status);

    if (!response.ok) {
      console.log('Sygemat API error:', response.status);
      throw new Error(`Sygemat API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Articles response received, count:', data?.count || 0);

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
    console.error('Articles error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Error al cargar artículos',
        count: 0,
        total_count: 0,
        art_prv_web_dis: []
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