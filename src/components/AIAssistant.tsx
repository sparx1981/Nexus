import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Cpu, Sparkles, User, Terminal, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getChatResponse } from '../services/geminiService';
import { useSchemaStore } from '../store/schemaStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Nexus Developer Assistant. How can I help you build your application today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tables = useSchemaStore(state => state.tables);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
        const schemaContext = JSON.stringify(tables, null, 2);
        const aiResponse = await getChatResponse(newMessages, schemaContext);
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "I'm sorry, I encountered an error connecting to the AI brain. Please check your API configuration." 
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
        "fixed top-14 right-0 bottom-0 w-80 bg-white border-l border-neutral-200 shadow-2xl flex flex-col z-40 transition-all duration-300 transform",
        isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Cpu className="text-white w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold text-neutral-900 text-sm">Nexus AI Assist</h3>
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-600 animate-pulse"></span>
                    <span className="text-[10px] text-neutral-500 font-medium">Online</span>
                </div>
            </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-neutral-200 rounded transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-3",
            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
          )}>
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'assistant' ? "bg-primary-50 text-primary-600" : "bg-neutral-100 text-neutral-600"
            )}>
              {msg.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={cn(
                "p-3 rounded-2xl text-xs leading-relaxed max-w-[85%]",
                msg.role === 'assistant' ? "bg-neutral-50 text-neutral-800" : "bg-primary-600 text-white shadow-sm"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-neutral-50 p-3 rounded-2xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                <span className="text-xs text-neutral-400">Assistant is thinking...</span>
              </div>
           </div>
        )}
      </div>

      {/* Constraints Footer */}
      <div className="px-4 py-2 bg-neutral-50/50 border-t border-neutral-100">
           <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <Terminal className="w-3 h-3" />
                <span>Context: App Builder • Main Screen</span>
           </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200">
        <div className="bg-neutral-100 rounded-xl p-1 flex items-center group focus-within:ring-2 focus-within:ring-primary-600 transition-all">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 disabled:bg-neutral-400 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
