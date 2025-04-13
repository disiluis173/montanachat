// netlify/functions/deepseek-chat.js

exports.handler = async (event, context) => {
  // 1. Verificar método HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Método no permitido. Solo se acepta POST.' }),
    };
  }

  // 2. Verificar API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Error: La variable de entorno DEEPSEEK_API_KEY no está configurada.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor: API Key no configurada.' }),
    };
  }

  // 3. IMPORTANTE: Guardar el cuerpo una sola vez
  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
    if (!Array.isArray(parsedBody.messages)) {
      throw new Error("El campo 'messages' debe ser un array.");
    }
  } catch (error) {
    console.error('Error al parsear el cuerpo de la solicitud:', error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Cuerpo de la solicitud inválido o falta el array de messages.' }),
    };
  }

  // 4. Llamar a Deepseek
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  try {
    console.log('Llamando a la API de Deepseek con mensajes:', JSON.stringify(parsedBody.messages));
    
    // EVITAR SOBRECARGAR LA RESPUESTA AQUÍ
    let responseText = null;
    let responseStatus = null;
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: parsedBody.messages,
        temperature: 0.7,
        max_tokens: 800, // Reducir para evitar timeouts
        stream: false
      }),
    });
    
    // Guardar estatus antes de intentar leer el cuerpo
    responseStatus = response.status;
    
    // 5. IMPORTANTE: Leer el cuerpo UNA SOLA VEZ
    const responseData = await response.text();
    
    // Comprobar si es JSON válido
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch (e) {
      console.error("Respuesta no es JSON válido:", responseData);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: `Error al procesar respuesta: ${responseData.substring(0, 100)}...` 
        }),
      };
    }

    // Validar respuesta según status
    if (!response.ok) {
      console.error(`Error desde la API de Deepseek (${responseStatus}):`, parsedResponse);
      return {
        statusCode: responseStatus,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: `Error ${responseStatus}: ${parsedResponse.error?.message || JSON.stringify(parsedResponse)}` 
        }),
      };
    }

    // 6. Éxito
    console.log('Respuesta recibida de Deepseek:', JSON.stringify(parsedResponse, null, 2));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: parsedResponse.choices?.[0]?.message?.content || "No se recibió respuesta del modelo."
      }),
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
