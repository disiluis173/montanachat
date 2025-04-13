// netlify/functions/deepseek-chat.js
exports.handler = async (event, context) => {
  // Verificar método y obtener API key (código sin cambios)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Método no permitido. Solo se acepta POST.' }),
    };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Error: La variable de entorno DEEPSEEK_API_KEY no está configurada.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor: API Key no configurada.' }),
    };
  }

  // Parsear los mensajes (código sin cambios)
  let messages;
  try {
    const body = JSON.parse(event.body);
    messages = body.messages;
    if (!Array.isArray(messages)) {
      throw new Error("El campo 'messages' debe ser un array.");
    }
  } catch (error) {
    console.error('Error al parsear el cuerpo de la solicitud:', error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Cuerpo de la solicitud inválido o falta el array de mensajes.' }),
    };
  }

  // URL correcta con /v1/
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  try {
    console.log('Llamando a la API de Deepseek con mensajes:', JSON.stringify(messages));
    
    // CAMBIO: Configurar stream=true en la solicitud
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true  // Activar streaming
      }),
    });

    // Manejar errores (similar al código anterior)
    if (!response.ok) {
      let errorMessage = '';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error?.message || JSON.stringify(errorJson);
      } catch (e) {
        const errorText = await response.text();
        errorMessage = errorText;
      }

      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: `Error ${response.status}: ${errorMessage}` 
        }),
      };
    }

    // CAMBIO: Devolver la respuesta como stream
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      },
      body: response.body, // Pasar el stream directamente
      isBase64Encoded: false
    };

  } catch (error) {
    console.error('Error general en la Netlify Function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: false,
        error: 'Error de conexión: ' + (error.message || 'desconocido') 
      }),
    };
  }
};
