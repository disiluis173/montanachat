import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPage from './components/ChatPage';
// ASUME que tienes este servicio API - ajusta la ruta si es necesario
import { sendMessageToAI } from './services/api';
import './App.css'; // Asegúrate que App.css tenga los estilos (ej. .typing-indicator)

// --- OPCIONAL: Importa iconos si los vas a usar ---
//import { FiMenu, FiBell, FiSettings, FiUser, FiEdit, FiTrash2, FiLock, FiUnlock, FiMessageSquare, FiCode, FiGift, FiPlus, FiChevronsLeft, FiMessageCircle, FiCodepen, FiFeather } from 'react-icons/fi'; // Ejemplo


// Estructura inicial CORRECTA del estado, incluyendo messages
const initialConversations = [
    { id: 1, title: "Nueva conversación", date: "Hoy", messages: [{ sender: 'ai', text: "¡Hola! Soy Montana AI. ¿En qué puedo ayudarte hoy?", timestamp: Date.now() }], active: true },
    { id: 2, title: "Proyecto React", date: "Ayer", messages: [], active: false },
    { id: 3, title: "Configuración TailwindCSS", date: "3 Abr", messages: [], active: false },
];

const PASSWORD = "luis"; // ¡Usa variables de entorno en producción!
const MESSAGE_LIMIT = 5;
const COOLDOWN_MINUTES = 30;

function App() {
    const [showSidebar, setShowSidebar] = useState(true);
    const [activeTab, setActiveTab] = useState('home'); // Empezar en Home como en la imagen
    const [conversations, setConversations] = useState(initialConversations);
    const [renamingConversationId, setRenamingConversationId] = useState(null);
    const [newTitle, setNewTitle] = useState("");

    // Estado para límite de uso
    const [messageCount, setMessageCount] = useState(0);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [cooldownEndTime, setCooldownEndTime] = useState(null);
    const [showCooldownMessage, setShowCooldownMessage] = useState(false); // Para mostrar mensaje de cooldown en input
    const [timeLeft, setTimeLeft] = useState(0);

    // Estado para saber si la IA está respondiendo
    const [isAiResponding, setIsAiResponding] = useState(false);

    // Efecto para manejar el temporizador de cooldown
    useEffect(() => {
        let interval;
        if (cooldownEndTime && !isUnlocked && cooldownEndTime > Date.now()) {
             setShowCooldownMessage(true); // Mostrar mensaje si el cooldown está activo
             setTimeLeft(Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000))); // Calcular tiempo inicial
            interval = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((cooldownEndTime - now) / 1000));
                setTimeLeft(remaining);
                if (remaining === 0) {
                    setCooldownEndTime(null);
                    setMessageCount(0); // Reiniciar contador al terminar cooldown
                    setShowCooldownMessage(false);
                    clearInterval(interval);
                }
            }, 1000);
        } else {
            setShowCooldownMessage(false); // Ocultar si no hay cooldown
             setTimeLeft(0);
        }
        // Limpieza al desmontar o cambiar cooldownEndTime/isUnlocked
        return () => clearInterval(interval);
    }, [cooldownEndTime, isUnlocked]);

    const toggleSidebar = () => setShowSidebar(!showSidebar);

    // Seleccionar conversación y cambiar a la pestaña API
    const selectConversation = (id) => {
        setConversations(prevConvs =>
            prevConvs.map(conv => ({
                ...conv,
                active: conv.id === id
            }))
        );
        setActiveTab('api'); // Asegurarse de estar en la pestaña API
        setRenamingConversationId(null); // Cancelar renombrado al cambiar
    };

    // Iniciar nuevo chat
    const startNewChat = () => {
        const newChat = {
            id: Date.now(), // Usar timestamp o UUID
            title: "Nueva conversación",
            date: "Ahora",
            messages: [{ sender: 'ai', text: "Nueva conversación iniciada. ¿Cómo puedo ayudarte?", timestamp: Date.now() }], // Añadir array de mensajes
            active: true
        };
        setConversations(prevConvs => [
            newChat,
            ...prevConvs.map(conv => ({ ...conv, active: false })) // Desactivar las otras
        ]);
        setActiveTab('api'); // Ir a la pestaña API
    };

    // Funciones de renombrado
    const startRename = (conv) => {
        setRenamingConversationId(conv.id);
        setNewTitle(conv.title);
    };
    const cancelRename = () => {
        setRenamingConversationId(null);
        setNewTitle("");
    };
    const handleRenameChange = (event) => {
        setNewTitle(event.target.value);
    };
    const saveRename = (id) => {
        setConversations(prevConvs =>
            prevConvs.map(conv =>
                conv.id === id ? { ...conv, title: newTitle.trim() || "Conversación sin título" } : conv
            )
        );
        setRenamingConversationId(null);
        setNewTitle("");
    };

     // Borrar conversación
     const deleteConversation = (idToDelete) => {
        setConversations(prevConvs => {
            const remainingConvs = prevConvs.filter(conv => conv.id !== idToDelete);
            const wasActiveDeleted = prevConvs.find(c => c.id === idToDelete && c.active);

            if (remainingConvs.length > 0 && wasActiveDeleted) {
                remainingConvs[0].active = true; // Activa la primera si se borró la activa
                setActiveTab('api');
            } else if (remainingConvs.length === 0) {
                setActiveTab('home'); // Vuelve a home si no quedan chats
            } else if (!wasActiveDeleted && !remainingConvs.some(c => c.active)) {
                 // Si se borró una inactiva y ninguna otra está activa, activa la primera
                 if (remainingConvs.length > 0) {
                     remainingConvs[0].active = true;
                     setActiveTab('api'); // Asegura que la pestaña cambie a API si se activa un chat
                 } else {
                     setActiveTab('home'); // Si no quedan chats, vuelve a home
                 }
            }
            // Si se borró una inactiva y otra ya estaba activa, no se hace nada extra

            return remainingConvs;
        });
    };


    // Manejar envío de mensajes (con llamada a API)
    const handleSendMessage = async (messageText) => {
        const isCurrentlyLocked = !isUnlocked && !!cooldownEndTime && cooldownEndTime > Date.now();
        if (isCurrentlyLocked || isAiResponding) {
            console.log("Envío bloqueado:", { isCurrentlyLocked, isAiResponding });
            return;
        }

        const activeConv = conversations.find(c => c.active);
        if (!activeConv) {
             console.error("No hay conversación activa para enviar mensaje.");
             return;
        }

        const newUserMessage = { sender: 'user', text: messageText, timestamp: Date.now() };

        // Actualizar UI inmediatamente con mensaje de usuario y poner AI en estado "responding"
        setConversations(prevConvs =>
            prevConvs.map(conv =>
                conv.id === activeConv.id
                    ? { ...conv, messages: [...conv.messages, newUserMessage] }
                    : conv
            )
        );
        setIsAiResponding(true); // Empezar a cargar

        // --- SIMULACIÓN DE LLAMADA API (REEMPLAZAR CON LLAMADA REAL) ---
        // const apiMessages = [...activeConv.messages, newUserMessage].map(msg => ({
        //     role: msg.sender === 'ai' ? 'assistant' : 'user',
        //     content: msg.text
        // }));

        let aiMessage;
        try {
            console.log("Enviando a API:", [...activeConv.messages, newUserMessage].map(msg => ({
                     role: msg.sender === 'ai' ? 'assistant' : 'user',
                     content: msg.text
            })));
            // --- LLAMADA REAL A LA API (DESCOMENTAR Y AJUSTAR) ---
            const response = await sendMessageToAI([...activeConv.messages, newUserMessage].map(msg => ({
                     role: msg.sender === 'ai' ? 'assistant' : 'user',
                     content: msg.text
            })));
            console.log("Respuesta API:", response);

            if (response.success && response.data) {
                aiMessage = { sender: 'ai', text: response.data, timestamp: Date.now() + 1 }; // +1 para asegurar orden si responde muy rápido
            } else {
                aiMessage = { sender: 'ai', text: response.error || "Hubo un error al procesar tu solicitud.", timestamp: Date.now() + 1, isError: true };
            }

            // --- FIN LLAMADA REAL ---

        } catch (error) {
            console.error("Error llamando a sendMessageToAI:", error);
            aiMessage = { sender: 'ai', text: "Error de conexión con el asistente. Intenta de nuevo.", timestamp: Date.now() + 1, isError: true };
        } finally {
             // Añadir mensaje de AI (o error) a la conversación correcta, incluso si cambió mientras esperaba
             setConversations(prevConvs =>
                 prevConvs.map(conv =>
                     conv.id === activeConv.id // Busca la conversación original por ID
                         ? { ...conv, messages: [...conv.messages, aiMessage] } // Añade la respuesta
                         : conv
                 )
             );
            setIsAiResponding(false); // Terminar de cargar

            // Lógica de Cooldown (solo si no está desbloqueado y la llamada fue 'exitosa' en el sentido de contarla)
             if (!isUnlocked) {
                 const newCount = messageCount + 1;
                 setMessageCount(newCount);
                 if (newCount >= MESSAGE_LIMIT) {
                     console.log("Límite alcanzado. Iniciando cooldown.");
                     const newCooldownEndTime = Date.now() + COOLDOWN_MINUTES * 60 * 1000;
                     setCooldownEndTime(newCooldownEndTime);
                     // setTimeLeft y setShowCooldownMessage se actualizarán por el useEffect
                 }
             }
        }
    };


    // Desbloquear límites
    const handleUnlock = () => {
        const inputPassword = prompt("Ingresa la contraseña para liberar el límite:");
        if (inputPassword === PASSWORD) {
            setIsUnlocked(true);
            setCooldownEndTime(null);
            setMessageCount(0);
            setShowCooldownMessage(false); // Asegurar que se oculte el mensaje
            alert("¡Límites desbloqueados!");
        } else if (inputPassword !== null) { // Si el usuario escribió algo (no canceló)
            alert("Contraseña incorrecta.");
        }
    };

    // Calcular conversación activa para pasarla como prop
    const activeConversation = useMemo(() => conversations.find(conv => conv.active), [conversations]);

    // Formatear tiempo restante
    const formatTimeLeft = (seconds) => {
        if (seconds <= 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // --- Variantes de Animación ---
    const sidebarVariants = {
        open: { x: 0, width: '18rem', /* 288px */ transition: { type: "spring", stiffness: 300, damping: 30 } },
        closed: { x: "-100%", width: '18rem', transition: { type: "spring", stiffness: 300, damping: 30 } }
    };
     const conversationItemVariants = {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -50, transition: { duration: 0.2 } }
    };
    const tabContentVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeInOut" } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: "easeInOut" } }
    };

    // --- JSX ---
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden font-sans"> {/* Ajustado fondo */}
            {/* Sidebar */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div
                        key="sidebar"
                        variants={sidebarVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="bg-gray-800 text-white h-full flex flex-col shadow-lg relative z-20 flex-shrink-0" // Width manejado por variants
                    >
                        {/* Header Sidebar */}
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                             <div className="flex items-center">
                                {/* Icono Placeholder */}
                                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-md flex items-center justify-center mr-3 shadow-md text-purple-100 font-bold text-lg">
                                     M {/* Reemplazar con <FiMessageSquare /> o similar */}
                                </div>
                                <h1 className="font-bold text-xl tracking-tight">Montana AI</h1>
                             </div>
                             {/* Botón para ocultar sidebar (opcional, si quieres añadirlo) */}
                             {/* <button onClick={toggleSidebar} className="p-1 rounded hover:bg-gray-700">
                                 <FiChevronsLeft className="h-5 w-5" />
                             </button> */}
                        </div>

                        {/* Nuevo Chat Button */}
                        <div className="p-3 flex-shrink-0">
                             <button
                                onClick={startNewChat}
                                className="w-full flex items-center justify-center p-3 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 ease-in-out text-white font-semibold shadow hover:shadow-md transform hover:-translate-y-0.5"
                            >
                                 {/* <FiPlus className="mr-2 h-5 w-5" /> Reemplaza '+' */}
                                 <span className="mr-2 text-lg">+</span>
                                Nuevo chat
                             </button>
                        </div>

                        {/* Pestañas Demo/API */}
                        <div className="mt-2 flex space-x-2 px-3 flex-shrink-0">
                            {['home', 'api'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                                        activeTab === tab
                                            ? 'bg-purple-700 text-white shadow-sm'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {tab === 'home' ? 'Demo' : 'API'}
                                </button>
                            ))}
                        </div>

                        {/* Lista de Conversaciones */}
                        <div className="mt-4 flex-1 overflow-y-auto px-1 custom-scrollbar"> {/* Contenedor scrollable */}
                            <h2 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conversaciones</h2>
                             <AnimatePresence initial={false}>
                                {conversations.map(conv => (
                                    <motion.div
                                        key={conv.id}
                                        layout // Animar cambios de layout (al borrar/añadir)
                                        variants={conversationItemVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className={`group relative flex items-center justify-between p-2 mx-2 rounded-md cursor-pointer mb-1 transition-colors duration-150 ease-in-out ${
                                            conv.active ? 'bg-gradient-to-r from-purple-800 to-indigo-800 shadow-inner' : 'hover:bg-gray-700'
                                        }`}
                                        onClick={() => !renamingConversationId && selectConversation(conv.id)}
                                    >
                                        {renamingConversationId === conv.id ? (
                                            // Input para renombrar
                                            <div className="flex-1 flex items-center mr-1">
                                                <input
                                                    type="text"
                                                    value={newTitle}
                                                    onChange={handleRenameChange}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(conv.id); if (e.key === 'Escape') cancelRename(); }}
                                                    // Guardar al perder foco, con un pequeño delay por si clickean los botones
                                                    onBlur={() => setTimeout(() => { if (renamingConversationId === conv.id) saveRename(conv.id); }, 150)}
                                                    autoFocus
                                                    className="text-sm bg-gray-600 text-white rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                                {/* Botones de guardar/cancelar (texto) */}
                                                <button onClick={(e) => { e.stopPropagation(); saveRename(conv.id); }} className="p-1 text-green-400 hover:text-green-300 ml-1 text-xs flex-shrink-0">OK</button>
                                                <button onClick={(e) => { e.stopPropagation(); cancelRename(); }} className="p-1 text-red-400 hover:text-red-300 text-xs flex-shrink-0">X</button>
                                            </div>
                                        ) : (
                                            // Vista normal
                                            <>
                                                {/* Icono placeholder */}
                                                <div className={`w-4 h-4 mr-2 flex-shrink-0 rounded-full ${conv.active ? 'bg-purple-400' : 'bg-gray-500 group-hover:bg-gray-400'}`}></div>
                                                <div className="flex-1 min-w-0 mr-2"> {/* min-w-0 para que truncate funcione */}
                                                    <p className={`text-sm font-medium truncate ${conv.active ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>{conv.title}</p>
                                                    <p className="text-xs text-gray-400 group-hover:text-gray-300">{conv.date}</p>
                                                </div>
                                                {/* Botones Editar/Borrar (iconos, aparecen al hover) */}
                                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gray-700 rounded px-1 py-0.5">
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); startRename(conv); }}
                                                        className="text-gray-300 hover:text-white p-0.5" // Ajustado padding
                                                        aria-label="Renombrar conversación"
                                                    >
                                                         {/* <FiEdit className="h-3 w-3" /> Reemplaza 'Ren' */}
                                                         Ren
                                                     </button>
                                                     <span className="text-gray-500 text-xs mx-0.5">|</span>
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                                        className="text-gray-300 hover:text-red-400 p-0.5" // Ajustado padding
                                                        aria-label="Eliminar conversación"
                                                    >
                                                         {/* <FiTrash2 className="h-3 w-3" /> Reemplaza 'Del' */}
                                                         Del
                                                     </button>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                         {/* Footer Sidebar - Plan Gratuito */}
                        <div className="p-4 border-t border-gray-700 mt-auto flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    {/* Placeholder para icono lock/unlock */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white text-xs font-bold ${isUnlocked ? 'bg-green-500' : 'bg-purple-600'}`}>
                                        {/* {isUnlocked ? <FiUnlock className="h-4 w-4" /> : <FiLock className="h-4 w-4" />} Reemplaza 'UL'/'L' */}
                                        {isUnlocked ? 'UL' : 'L'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{isUnlocked ? 'Plan Ilimitado' : 'Plan Gratuito'}</p>
                                        {!isUnlocked && (
                                            <p className="text-xs text-gray-400">
                                                {cooldownEndTime && cooldownEndTime > Date.now()
                                                    ? `Cooldown: ${formatTimeLeft(timeLeft)}`
                                                    : `${messageCount} / ${MESSAGE_LIMIT} usados`
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!isUnlocked && (
                                    <button
                                        onClick={handleUnlock}
                                        className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-1 px-3 rounded-full shadow transition-all transform hover:scale-105"
                                        disabled={isUnlocked}
                                        aria-label="Liberar límites"
                                    >
                                        Liberar
                                    </button>
                                )}
                            </div>
                             {/* Mensaje de Cooldown en Sidebar */}
                             {showCooldownMessage && !isUnlocked && cooldownEndTime && cooldownEndTime > Date.now() && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-center text-yellow-400 bg-yellow-900 bg-opacity-50 rounded p-2 mt-1">
                                    Límite alcanzado. Espera {formatTimeLeft(timeLeft)}.
                                </motion.div>
                            )}
                             {/* Info de Usuario (Ejemplo) */}
                             <div className="flex items-center mt-3 pt-3 border-t border-gray-700 border-opacity-50">
                                <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center ring-2 ring-gray-600">
                                     {/* <FiUser className="h-4 w-4 text-white" /> Reemplaza 'LP' */}
                                    <span className="text-sm font-bold text-white">LP</span>
                                 </div>
                                <div className="ml-3">
                                     <p className="text-sm font-medium text-gray-200">Luciano P.</p>
                                     <p className="text-xs text-gray-400 hover:text-purple-400 cursor-pointer">Ver perfil</p>
                                 </div>
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                 {/* Top navbar */}
                 <div className="bg-gray-800 text-white p-3 flex items-center justify-between shadow-md relative z-10 flex-shrink-0">
                     <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md hover:bg-gray-700 transition-colors mr-2"
                        aria-label="Toggle Sidebar"
                    >
                         {/* <FiMenu className="h-6 w-6" /> Reemplaza '=' */}
                         <span className="font-bold text-xl">=</span>
                     </button>
                    <div className="text-lg font-semibold truncate px-2">
                         {activeTab === 'home' ? 'Montana AI Chat Demo' : (activeConversation?.title || 'Montana AI Chat')}
                     </div>
                    <div className="flex items-center space-x-2">
                         {/* Placeholder para iconos */}
                         <button className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Notificaciones">
                             {/* <FiBell className="h-5 w-5" /> Reemplaza 'N' */}
                             N
                         </button>
                         <button className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Configuración">
                             {/* <FiSettings className="h-5 w-5" /> Reemplaza 'S' */}
                             S
                         </button>
                          <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center ring-2 ring-gray-900">
                               {/* <FiUser className="h-4 w-4 text-white" /> Reemplaza 'LP' */}
                              <span className="text-sm font-bold text-white">LP</span>
                           </div>
                    </div>
                </div>

                 {/* Contenido de la pestaña */}
                 <div className="flex-1 overflow-y-auto relative bg-white dark:bg-gray-800"> {/* Ajustado fondo y padding */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'home' ? (
                            <motion.div
                                key="home"
                                variants={tabContentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="p-4 md:p-6 lg:p-8 h-full text-gray-900 dark:text-gray-100" // Añadido h-full y color de texto
                            >
                                {/* ===== INICIO CONTENIDO DEMO ACTUALIZADO ===== */}
                                <div className="max-w-4xl mx-auto">
                                     <div className="bg-white dark:bg-gray-700 rounded-lg shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-600"> {/* Ajustado fondo y borde */}
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4">Bienvenido a Montana AI</h1>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                                             Explora las capacidades de nuestra IA. Esta es una demostración de la interfaz. Selecciona una conversación existente o
                                             crea una nueva para interactuar con la API, o simplemente explora las funcionalidades abajo.
                                        </p>
                                         {/* Contenedor para los botones */}
                                        <div className="flex flex-wrap gap-4"> {/* Usar flex-wrap y gap para mejor responsive */}
                                            <button
                                                onClick={startNewChat}
                                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                            >
                                                Iniciar Nuevo Chat
                                            </button>

                                             {/* --- BOTÓN "VER DOCUMENTACIÓN" AÑADIDO --- */}
                                             <button
                                                 // onClick={() => { /* Lógica para ver documentación */ }}
                                                 className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-md shadow hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                             >
                                                 Ver Documentación
                                             </button>
                                             {/* --- FIN BOTÓN AÑADIDO --- */}
                                        </div>
                                    </div>

                                     {/* Tarjetas de funcionalidades */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                         {/* --- Tarjeta Chat Inteligente (ACTUALIZADA) --- */}
                                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg">Chat Inteligente</h3>
                                                {/* Placeholder para icono (reemplazar con tu componente/svg) */}
                                                <span className="text-2xl">
                                                    {/* <FiMessageCircle /> */}
                                                    💬
                                                </span>
                                            </div>
                                            <p className="text-sm text-purple-100">
                                                 Interactúa con nuestro AI avanzado para resolver dudas, generar ideas y más.
                                            </p>
                                        </div>

                                         {/* --- Tarjeta Generación de Código (ACTUALIZADA) --- */}
                                         <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-lg p-6 text-white flex flex-col">
                                             <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg">Generación de Código</h3>
                                                 {/* Placeholder para icono (reemplazar con tu componente/svg) */}
                                                 <span className="text-2xl">
                                                     {/* <FiCodepen /> */}
                                                     &lt;/&gt;
                                                 </span>
                                            </div>
                                            <p className="text-sm text-teal-100">
                                                 Obtén ayuda para escribir, depurar y optimizar código en varios lenguajes.
                                            </p>
                                        </div>

                                         {/* --- TARJETA NUEVA CONTENIDO CREATIVO (AÑADIDA) --- */}
                                         <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-lg p-6 text-white flex flex-col md:col-span-2"> {/* Ocupa todo el ancho en md */}
                                             <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg">Contenido Creativo</h3>
                                                {/* Placeholder para icono (reemplazar con tu componente/svg) */}
                                                 <span className="text-2xl">
                                                     {/* <FiFeather /> */}
                                                     💡
                                                 </span>
                                            </div>
                                            <p className="text-sm text-pink-100">
                                                 Genera artículos, correos electrónicos, guiones y otros textos creativos adaptados a tus necesidades.
                                            </p>
                                        </div>
                                         {/* --- FIN TARJETA NUEVA --- */}

                                    </div>
                                </div>
                                {/* ===== FIN CONTENIDO DEMO ACTUALIZADO ===== */}
                            </motion.div>
                        ) : (
                             // Renderizado Condicional de ChatPage
                            <motion.div
                                key={activeConversation?.id || 'no-chat'} // Cambiar key al cambiar de chat o si no hay chat
                                variants={tabContentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="h-full flex flex-col" // Ocupa toda la altura
                            >
                                {activeConversation ? (
                                    // *** PASANDO LAS PROPS CORRECTAS ***
                                    <ChatPage
                                        key={activeConversation.id} // Clave única para forzar re-renderizado al cambiar
                                        conversation={activeConversation}
                                        onSendMessage={handleSendMessage}
                                        isLocked={!isUnlocked && !!cooldownEndTime && cooldownEndTime > Date.now()}
                                        timeLeft={timeLeft}
                                        formatTimeLeft={formatTimeLeft}
                                        isAiResponding={isAiResponding}
                                    />
                                ) : (
                                    // Mensaje si no hay conversación activa en la pestaña API
                                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-4">
                                        <div className="text-center">
                                            <p className="text-xl mb-4">🤔</p> {/* Emoji placeholder */}
                                            <p>Selecciona una conversación o crea una nueva para empezar.</p>
                                            <button
                                                onClick={startNewChat}
                                                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow hover:shadow-lg transition-all"
                                            >
                                                 {/* <FiPlus className="inline mr-1 h-4 w-4" /> Reemplaza '+' */}
                                                 + Nuevo Chat
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default App;