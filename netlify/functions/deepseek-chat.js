// netlify/functions/deepseek-chat.js

// Importa 'node-fetch' si necesitas hacer llamadas fetch desde Node.js
// En las versiones más recientes de Node.js soportadas por Netlify, 'fetch' puede ser global.
// Si encuentras errores relacionados con fetch, descomenta la siguiente línea e instala node-fetch:
// npm install node-fetch
// const fetch = require('node-fetch'); // O usa import si tu proyecto está configurado para ES Modules

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
    // El cuerpo de la solicitud viene en event.body como un string JSON
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
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'; // URL oficial de la API de Deepseek Chat

  try {
    console.log('Llamando a la API de Deepseek...');
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Autenticación tipo Bearer Token
      },
      body: JSON.stringify({
        model: "deepseek-chat", // O el modelo específico que estés usando
        messages: messages,     // El historial de mensajes recibido del frontend
        // Puedes añadir otros parámetros si son necesarios (temperature, max_tokens, etc.)
        // stream: false, // Asegúrate de que no esté en modo stream si esperas una respuesta completa
      }),
    });

    // 5. Manejar la respuesta de la API de Deepseek
    if (!response.ok) {
      // Si Deepseek devuelve un error
      const errorText = await response.text();
      console.error(`Error desde la API de Deepseek (${response.status}): ${errorText}`);
      // Devuelve el error al frontend
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        // Intenta devolver el mensaje de error de Deepseek si es posible
        body: JSON.stringify({ error: `Error al contactar la IA: ${errorText}` }),
      };
    }

    // Si la llamada a Deepseek fue exitosa
    const aiData = await response.json();
    console.log('Respuesta recibida de Deepseek:', JSON.stringify(aiData, null, 2));

    // 6. Devolver la respuesta de Deepseek al frontend
    // Tu frontend (api.js) espera directamente el objeto JSON de la respuesta.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiData), // Envía la respuesta completa de Deepseek
    };

  } catch (error) {
    // Capturar errores generales (ej. de red al llamar a Deepseek)
    console.error('Error general en la Netlify Function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor al procesar la solicitud.' }),
    };
  }
};