// server.js
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.REACT_APP_DEEPSEEK_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "Eres Montana AI, un asistente virtual amigable y servicial." },
        ...messages
      ],
    });
    
    res.json({
      success: true,
      data: response.choices[0].message.content
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
