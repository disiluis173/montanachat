// src/services/api.js

export const sendMessageToAI = async (messages) => {
  // URL dinámica según el entorno (desarrollo o producción)
  const API_URL = process.env.NODE_ENV === 'production'
    ? '/.netlify/functions/deepseek-chat' // URL para Netlify Functions en producción
    : 'http://localhost:5000/api/chat';   // URL para desarrollo local
  
  try {
    console.log('Enviando mensaje a:', API_URL);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    
    // Manejo mejorado de errores HTTP
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText || 'Sin detalles'}`);
    }
    
    // Verificar si la respuesta es un stream (content-type contiene 'event-stream')
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('text/event-stream')) {
      // Procesar como stream
      const reader = response.body.getReader();
      let completeResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decodificar el chunk
        const chunk = new TextDecoder().decode(value);
        
        // Procesar cada línea que comienza con "data: "
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // Ignorar el [DONE] que envía DeepSeek al final
            if (data === '[DONE]') continue;
            
            try {
              const parsedData = JSON.parse(data);
              const contentDelta = parsedData.choices[0]?.delta?.content || '';
              completeResponse += contentDelta;
            } catch (e) {
              console.error('Error parsing streaming chunk:', e);
            }
          }
        }
      }
      
      return {
        success: true,
        data: completeResponse
      };
    } else {
      // Procesar como JSON regular (para compatibilidad)
      const data = await response.json();
      return data;
    }
    
  } catch (error) {
    console.error('Error al comunicarse con el servidor:', error);
    
    // Respuesta de error mejorada con mensaje para usuarios
    return {
      success: false,
      error: error.message || "Error de conexión con el asistente",
      data: {
        text: "Lo siento, parece que estamos teniendo problemas de conexión. Por favor, intenta de nuevo en unos momentos."
      }
    };
  }
};
