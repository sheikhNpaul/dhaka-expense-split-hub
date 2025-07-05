import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Send, ChevronDown, Check, CheckCheck, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  home_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url?: string;
  };
}

interface MessagesProps {
  currentHomeId: string;
}

export const Messages = ({ currentHomeId }: MessagesProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentHomeId) return;
    fetchMessages();
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        if (newMessage.user_id !== user?.id) {
          setUnreadCount(prev => prev + 1);
        }
        scrollToBottom();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line
  }, [currentHomeId]);

  const fetchMessages = async () => {
    if (!currentHomeId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar_url)')
      .eq('home_id', currentHomeId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setShowScrollButton(!isAtBottom);
    if (isAtBottom) {
      setUnreadCount(0);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newMessage && !file)) return;
    let file_url = null;
    if (file) {
      setUploading(true);
      const filePath = `${currentHomeId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (!error && data) {
        const { publicUrl } = supabase.storage.from('chat-files').getPublicUrl(filePath).data;
        file_url = publicUrl;
      }
      setUploading(false);
      setFile(null);
    }
    // Optimistically add the message
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      home_id: currentHomeId,
      user_id: user.id,
      content: newMessage,
      file_url,
      created_at: new Date().toISOString(),
      profiles: { name: user.user_metadata?.name || user.email || 'You', avatar_url: user.user_metadata?.avatar_url || '' },
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    scrollToBottom();
    await supabase.from('messages').insert({
      home_id: currentHomeId,
      user_id: user.id,
      content: optimisticMsg.content,
      file_url: optimisticMsg.file_url,
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-xs text-muted-foreground">Home Chat</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-background to-muted/5" 
        ref={messagesContainerRef} 
        onScroll={handleScroll}
      >
        {messages.map((msg, index) => {
          const isMe = msg.user_id === user?.id;
          const isImage = msg.file_url && (msg.file_url.endsWith('.jpg') || msg.file_url.endsWith('.jpeg') || msg.file_url.endsWith('.png') || msg.file_url.endsWith('.gif'));
          const isOptimistic = msg.id.startsWith('optimistic-');
          
          return (
            <div 
              key={msg.id} 
              className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500 ease-out`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 md:gap-3 w-full group max-w-full`}>
                {/* Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%] transition-all duration-300 hover:scale-[1.02]`}>
                  {/* Name above bubble for others */}
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-2 animate-in fade-in-50 slide-in-from-left-2 duration-300">
                      <Avatar className="h-6 w-6 flex-shrink-0 ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40">
                        <AvatarImage src={msg.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {msg.profiles?.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground font-semibold bg-gradient-to-r from-muted-foreground to-muted-foreground/70 bg-clip-text text-transparent">
                        {msg.profiles?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-3 md:px-4 ${isMe 
                      ? 'bg-gradient-to-br from-[#1D9BF0] to-[#1A8CD8] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40' 
                      : 'bg-gradient-to-br from-[#F7F9F9] to-[#F0F2F5] text-[#0F1419] shadow-lg shadow-gray-200/50 hover:shadow-gray-300/60'
                    } max-w-[280px] md:max-w-[300px] flex flex-col transition-all duration-300 hover:scale-[1.01] relative overflow-hidden`} 
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.content && (
                      <div className="text-base md:text-base leading-relaxed whitespace-pre-line break-words mb-2 font-medium">
                        {msg.content}
                      </div>
                    )}
                    {msg.file_url && isImage && (
                      <div className="relative group/image mb-2">
                        <img 
                          src={msg.file_url} 
                          alt="attachment" 
                          className="rounded-xl max-w-[200px] md:max-w-[160px] max-h-[200px] md:max-h-[160px] object-cover transition-all duration-300 hover:scale-105 shadow-md" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-300 rounded-xl"></div>
                      </div>
                    )}
                    {msg.file_url && !isImage && (
                      <a 
                        href={msg.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block text-xs text-blue-600 underline hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 mb-2"
                      >
                        <Paperclip className="h-4 w-4" /> 
                        <span className="font-medium">File</span>
                      </a>
                    )}
                  </div>
                  {/* Time and status below bubble */}
                  <div className={`flex items-center gap-2 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-muted-foreground/70 font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <div className="flex items-center gap-1">
                        <CheckCheck className="h-3 w-3 text-white/70" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="w-full flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                ?
              </AvatarFallback>
            </Avatar>
            <div className="bg-gradient-to-br from-[#F7F9F9] to-[#F0F2F5] rounded-2xl px-4 py-3 shadow-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 animate-in slide-in-from-bottom-4 duration-300 z-50"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      )}
      
      {/* Mobile Input Bar */}
      <div className="flex-shrink-0 bg-background border-t border-primary/20 px-4 py-3">
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <label className="flex items-center cursor-pointer group flex-shrink-0">
            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Paperclip className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          </label>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-base bg-background/50 border-primary/20 focus:border-primary/40 transition-all duration-200 rounded-xl min-h-[44px]"
            disabled={uploading}
          />
          <Button 
            type="submit" 
            disabled={uploading || (!newMessage && !file)} 
            size="icon" 
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:scale-105 shadow-lg flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
        {file && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{file.name}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFile(null)}
              className="h-6 px-2 text-xs"
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 