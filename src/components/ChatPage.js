import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Importar Librerías para Markdown y Syntax Highlighting ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Soporte para GitHub Flavored Markdown (tablas, etc.)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Elige un tema para el resaltado de código. Ejemplos: atomOneDark, dracula, github, vs, vscDarkPlus ...
// Puedes explorar más estilos en node_modules/react-syntax-highlighter/dist/esm/styles/prism/
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';// -------------------------------------------------------------


// Componente TypingIndicator (sin cambios)
const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex mb-4 justify-start"
    >
        <div className="flex items-center bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 p-3 rounded-lg shadow rounded-bl-none">
            <div className="typing-indicator mr-2"> {/* Requiere CSS de App.css */}
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
            </div>
             <span className="text-sm italic">Montana AI está escribiendo...</span>
        </div>
    </motion.div>
);


// --- Componente MessageItem MODIFICADO para Markdown y Syntax Highlighting ---
const MessageItem = ({ message, index }) => {
    // Asegurarse que message y message.sender existen
    const isUser = message?.sender === 'user';

    const messageVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
          opacity: 1, y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: index * 0.05 },
        },
    };

    // Si el mensaje no es válido por alguna razón, no renderizar nada o un placeholder
    if (!message || typeof message.text === 'undefined') {
        console.warn("Invalid message object received in MessageItem:", message);
        return null; // O un div indicando un error de mensaje
    }


    return (
        <motion.div
            // Usar timestamp si existe y es único, sino combinar con index para más robustez
            key={message.timestamp ? `${message.timestamp}-${index}` : index}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            layout
            className={`mb-3 flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            {/* Placeholder Avatar AI */}
            {!isUser && (
                <div className="w-7 h-7 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1 text-purple-100 text-xs font-bold">
                     AI
                 </div>
            )}
             {/* Contenedor del mensaje: Añadidas clases 'prose' */}
             <div className={`prose prose-sm max-w-[75%] w-fit p-3 rounded-xl shadow-md ${ // prose aplica estilos base, prose-sm tamaño pequeño
                 isUser
                     ? 'ml-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none prose-invert' // Estilos para Markdown en fondo oscuro
                     : 'mr-auto bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-bl-none' // Estilos para Markdown en fondo claro
             } `}>
                 {/* --- Renderizado con ReactMarkdown --- */}
                <ReactMarkdown
                    // El texto del mensaje a renderizar
                    children={message.text ?? ''}
                    // Plugin para habilitar tablas, listas de tareas, etc. (GFM)
                    remarkPlugins={[remarkGfm]}
                    // Componentes personalizados para controlar cómo se renderizan ciertos elementos HTML
                    components={{
                        // --- Personalización para bloques de CÓDIGO ---
                        code(props) {
                          const {children, className, node, ...rest} = props;
                          // Intenta extraer el lenguaje del className (ej. "language-javascript")
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            // Si se encontró lenguaje, usa SyntaxHighlighter
                            <SyntaxHighlighter
                              {...rest}
                              children={String(children).replace(/\n$/, '')} // Contenido del código
                              style={oneDark} // Tema de resaltado importado
                              language={match[1]}   // Lenguaje detectado
                              PreTag="div"          // Usa <div> en lugar de <pre> para mejor estilo
                              className="rounded text-sm" // Clases Tailwind adicionales
                              wrapLongLines={true}  // Ajusta líneas largas
                            />
                          ) : (
                            // Si no hay lenguaje (código inline ``), usa <code> normal
                            <code {...rest} className={`bg-gray-200 text-red-600 px-1 py-0.5 rounded text-xs ${isUser ? 'bg-opacity-20 text-purple-200' : ''} ${className}`}>
                              {children}
                            </code>
                          );
                        },
                        // --- Otras personalizaciones opcionales ---
                        // Links: abrir en nueva pestaña (CORREGIDO AQUÍ)
                        a: ({node, children, ...props}) => (
                            <a 
                                {...props} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`font-medium ${isUser ? 'text-purple-300 hover:text-purple-200' : 'text-blue-600 hover:text-blue-800'} underline`}
                            >
                                {children}
                            </a>
                        ),
                        // Listas: asegurar estilos (prose debería ayudar)
                         ul: ({node, children, ...props}) => <ul {...props} className="list-disc list-outside ms-4">{children}</ul>,
                         ol: ({node, children, ...props}) => <ol {...props} className="list-decimal list-outside ms-4">{children}</ol>,
                         li: ({node, children, ...props}) => <li {...props} className="my-1">{children}</li>,
                    }}
                />
                 {/* ----------------------------------------- */}


                 {/* Timestamp opcional */}
                 {message.timestamp && (
                     <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-purple-200' : 'text-gray-500'} ${isUser ? 'text-left' : 'text-right'}`}>
                         {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                 )}
            </div>
            {/* Placeholder Avatar Usuario */}
            {isUser && (
                 <div className="w-7 h-7 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1 text-pink-100 text-xs font-bold">
                     TU
                 </div>
            )}
        </motion.div>
    );
};



// Componente Principal ChatPage
function ChatPage({ conversation, onSendMessage, isLocked, timeLeft, formatTimeLeft, isAiResponding }) {
    // --- Hooks ---
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);


    // --- useEffects ---
    // Efecto para hacer scroll hacia abajo cuando llegan mensajes nuevos o la IA responde
    useEffect(() => {
        // Solo hacer scroll si hay una conversación válida y el ref existe
        if (conversation && conversation.messages && messagesEndRef.current) {
             messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        // *** CORRECCIÓN: Añadida 'conversation' al array de dependencias ***
        // El efecto depende de 'conversation' (para verificar si existe) y 'isAiResponding'
    }, [conversation, isAiResponding]); // Antes era [conversation?.messages, isAiResponding]


    // Efecto para ajustar la altura del textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Resetear altura
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 160; // Altura máxima en píxeles (ej. 4 líneas)
            // Ajustar altura hasta el máximo permitido
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [inputText]); // Se ejecuta cada vez que cambia el texto de entrada


    // --- Validación de 'conversation' ---
    // Si la conversación no es válida, muestra un mensaje de error en lugar de intentar renderizar
    if (!conversation || !Array.isArray(conversation.messages)) {
        console.error("ChatPage recibió una prop 'conversation' inválida:", conversation);
         return (
             <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                 Error: No se pudo cargar la conversación. Selecciona otra o crea una nueva.
             </div>
         );
    }


    // --- Lógica del Componente ---
    const handleInputChange = (e) => { setInputText(e.target.value); };


    const handleSend = (e) => {
        e.preventDefault(); // Prevenir recarga de página en submit de formulario
        // No enviar si está bloqueado, la IA está respondiendo o el input está vacío
        if (isLocked || isAiResponding || !inputText.trim()) return;
        onSendMessage(inputText.trim()); // Llamar a la función del padre para enviar el mensaje
        setInputText(''); // Limpiar el input
        // Resetear altura del textarea después de enviar
        if (textareaRef.current) {
             textareaRef.current.style.height = 'auto';
        }
    };


    // --- JSX del Componente ---
    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Área de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence initial={false}>
                        {conversation.messages.map((msg, index) => (
                            // Renderizar cada mensaje usando MessageItem
                            <MessageItem key={msg.timestamp ? `${msg.timestamp}-${index}` : index} message={msg} index={index} />
                        ))}
                    </AnimatePresence>
                    {/* Mostrar indicador de escritura si la IA está respondiendo */}
                    {isAiResponding && <TypingIndicator />}
                    {/* Elemento vacío al final para hacer scroll */}
                    <div ref={messagesEndRef} />
                </div>
            </div>


            {/* Área de Input */}
            <div className="p-3 md:p-4 border-t border-gray-200 bg-white shadow-inner">
                 {/* Mostrar mensaje de cooldown si está bloqueado */}
                 {isLocked && (
                     <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-xs text-red-600 mb-2 font-medium bg-red-100 p-2 rounded-md"
                     >
                         <span className="mr-2">⏳</span>
                         Tiempo de espera restante: {formatTimeLeft ? formatTimeLeft(timeLeft) : 'Calculando...'}
                     </motion.div>
                 )}
                <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                    <div className="flex items-end bg-gray-100 rounded-xl p-2 border border-gray-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all duration-200">
                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder={isLocked ? "Espera para enviar..." : (isAiResponding ? "Esperando respuesta..." : "Escribe tu mensaje...")}
                            className="flex-1 bg-transparent border-0 focus:ring-0 resize-none px-3 py-2 text-sm text-gray-800 placeholder-gray-500 custom-scrollbar overflow-y-auto"
                            rows="1"
                            style={{ minHeight: '40px' }} // Altura mínima
                            onKeyDown={(e) => {
                                // Enviar con Enter (si no se presiona Shift)
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault(); // Prevenir salto de línea
                                    handleSend(e);      // Enviar mensaje
                                }
                            }}
                            disabled={isLocked || isAiResponding} // Deshabilitar si está bloqueado o esperando IA
                            aria-label="Campo de mensaje"
                        />
                        <button
                            type="submit"
                            className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ml-2 ${
                                isLocked || isAiResponding || !inputText.trim()
                                    ? 'bg-gray-300 cursor-not-allowed' // Estilo deshabilitado
                                    : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow hover:shadow-md transform hover:scale-110' // Estilo habilitado
                            }`}
                            disabled={isLocked || isAiResponding || !inputText.trim()} // Deshabilitar botón
                            aria-label="Enviar mensaje"
                        >
                             {/* Icono de enviar */}
                             <span className="font-bold text-lg transform rotate-45 inline-block">➤</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


export default ChatPage;
