// netlify/functions/deepseek-chat.js

exports.handler = async (event, context) => {
  // 1. Verificar el método HTTP (solo permitir POST)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Método no permitido. Solo se acepta POST.' }),
    };
  }

  // 2. Obtener la API Key de Deepseek desde las variables de entorno de Netlify
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error('Error: La variable de entorno DEEPSEEK_API_KEY no está configurada.');
    return {
      statusCode: 500, // Internal Server Error
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor: API Key no configurada.' }),
    };
  }

  // 3. Parsear los mensajes enviados desde el frontend
  let messages;
  try {
    const body = JSON.parse(event.body);
    messages = body.messages; // Extraer el array de mensajes
    if (!Array.isArray(messages)) {
      throw new Error("El campo 'messages' debe ser un array.");
    }
  } catch (error) {
    console.error('Error al parsear el cuerpo de la solicitud:', error);
    return {
      statusCode: 400, // Bad Request
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Cuerpo de la solicitud inválido o falta el array de mensajes.' }),
    };
  }

  // 4. Preparar y realizar la llamada a la API de Deepseek
  // CORRECCIÓN: URL CORRECTA CON /v1/
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  try {
    console.log('Llamando a la API de Deepseek con mensajes:', JSON.stringify(messages));
    
    // Si necesitas 'node-fetch' descomenta:
    // const fetch = require('node-fetch');
    
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
        max_tokens: 2000
      }),
    });

    // 5. Manejar la respuesta de la API de Deepseek
    if (!response.ok) {
      let errorMessage = '';
      try {
        // Intentar obtener detalles del error en formato JSON
        const errorJson = await response.json();
        errorMessage = errorJson.error?.message || JSON.stringify(errorJson);
        console.error(`Error desde la API de Deepseek (${response.status}):`, errorJson);
      } catch (e) {
        // Si no es JSON, obtener el texto
        const errorText = await response.text();
        errorMessage = errorText;
        console.error(`Error desde la API de Deepseek (${response.status}):`, errorText);
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

    // Si la llamada a Deepseek fue exitosa
    const aiData = await response.json();
    console.log('Respuesta recibida de Deepseek:', JSON.stringify(aiData, null, 2));

    // 6. Procesar la respuesta para enviar solo lo necesario al frontend
    // Adaptando formato a lo que espera tu frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: aiData.choices?.[0]?.message?.content || aiData
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