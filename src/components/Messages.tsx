import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Send, ChevronDown, Check, CheckCheck } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentHomeId) return;
    fetchMessages();
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
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
    <Card className="w-full max-w-2xl mx-auto h-[80vh] flex flex-col relative bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pb-2 relative bg-gradient-to-b from-transparent to-muted/10" ref={messagesContainerRef} onScroll={handleScroll}>
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
              <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 w-full group`}>
                {/* Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] transition-all duration-300 hover:scale-[1.02]`}>
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
                    className={`rounded-2xl px-3 py-2 sm:px-4 ${isMe 
                      ? 'bg-gradient-to-br from-[#1D9BF0] to-[#1A8CD8] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40' 
                      : 'bg-gradient-to-br from-[#F7F9F9] to-[#F0F2F5] text-[#0F1419] shadow-lg shadow-gray-200/50 hover:shadow-gray-300/60'
                    } max-w-[260px] sm:max-w-[300px] flex flex-col transition-all duration-300 hover:scale-[1.01] relative overflow-hidden`} 
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.content && (
                      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line break-words mb-1.5 font-medium">
                        {msg.content}
                      </div>
                    )}
                    {msg.file_url && isImage && (
                      <div className="relative group/image">
                        <img 
                          src={msg.file_url} 
                          alt="attachment" 
                          className="rounded-xl max-w-[140px] sm:max-w-[160px] max-h-[140px] sm:max-h-[160px] object-cover transition-all duration-300 hover:scale-105 shadow-md" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-300 rounded-xl"></div>
                      </div>
                    )}
                    {msg.file_url && !isImage && (
                      <a 
                        href={msg.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block text-xs text-blue-600 underline hover:text-blue-700 transition-colors duration-200 flex items-center gap-1"
                      >
                        <Paperclip className="h-4 w-4" /> 
                        <span className="font-medium">File</span>
                      </a>
                    )}
                  </div>
                  {/* Time and status below bubble */}
                  <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
      </CardContent>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-20 right-4 h-12 w-12 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 animate-in slide-in-from-bottom-4 duration-300"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      )}
      
      <form onSubmit={handleSend} className="flex gap-3 p-4 border-t border-primary/20 bg-gradient-to-r from-background to-muted/10">
        <label className="flex items-center cursor-pointer group">
          <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          <Paperclip className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        </label>
        <Input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm bg-background/50 border-primary/20 focus:border-primary/40 transition-all duration-200 rounded-xl"
          disabled={uploading}
        />
        <Button 
          type="submit" 
          disabled={uploading || (!newMessage && !file)} 
          size="icon" 
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:scale-105 shadow-lg"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </Card>
  );
}; 