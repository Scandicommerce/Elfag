import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers that definitely work with Supabase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
  
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Function called')
    
    const requestData = await req.json()
    console.log('📧 Request data:', requestData)
    
    const { to, subject, html } = requestData

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html')
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    console.log('🔑 API key exists:', !!apiKey)
    
    if (!apiKey) {
      console.log('⚠️ No RESEND_API_KEY found, simulating email send')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email simulated successfully (no API key configured)',
          data: { to, subject }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log('📤 Sending email via Resend...')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html
      }),
    })

    console.log('📧 Resend response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Resend error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend failed: ${errorText}`,
          status: res.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const result = await res.json()
    console.log('✅ Email sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
