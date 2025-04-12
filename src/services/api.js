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
    
    const data = await response.json();
    return data;
    
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
