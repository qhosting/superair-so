import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot, Sparkles } from 'lucide-react';

const AdminChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: '👋 Hola Admin. Soy tu copiloto operativo. ¿Necesitas consultar ventas, stock o redactar un correo?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom() }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || loading) return;

      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setLoading(true);

      try {
          const res = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: userMsg, context: 'admin_dashboard' })
          });
          const data = await res.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Lo siento, no pude procesar eso." }]);
      } catch (err) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Error de conexión con el cerebro IA." }]);
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-24 z-[50] w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all group"
          >
              <Bot size={24} className="group-hover:animate-pulse" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </button>
      );
  }

  return (
    <div className="fixed bottom-24 right-6 z-[60] w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><Sparkles size={18} className="text-sky-400"/></div>
                <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">SuperAir Copilot</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Potenciado por Gemini/GPT</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={18}/></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                        m.role === 'user' 
                        ? 'bg-sky-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                    }`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 rounded-tl-none flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Escribe tu consulta..."
                value={input}
                onChange={e => setInput(e.target.value)}
            />
            <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
                <Send size={18} />
            </button>
        </form>
    </div>
  );
};

export default AdminChat;