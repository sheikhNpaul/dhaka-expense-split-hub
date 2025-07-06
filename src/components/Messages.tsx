import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Send, ChevronDown, Check, CheckCheck, ArrowLeft, MoreHorizontal, Edit, Trash2, X, Smile, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  home_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
  deleted?: boolean;
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
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentHomeId) return;
    fetchMessages();
    fetchUserProfile();
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updatedMessage = payload.new as Message;
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        ));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const deletedMessageId = payload.old.id;
        setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line
  }, [currentHomeId]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

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

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setUserProfile(data);
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

  // Simple file upload function - converts to base64 for immediate functionality
  const uploadFile = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newMessage && !file)) return;
    
    let file_url = null;
    
    if (file) {
      setUploading(true);
      try {
        // Convert file to base64 for immediate functionality
        const base64Data = await uploadFile(file);
        if (base64Data) {
          file_url = base64Data;
          toast({
            title: "File attached",
            description: `${file.name} attached successfully!`,
          });
        } else {
          toast({
            title: "File upload failed",
            description: "Could not process file. Message sent without attachment.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('File upload error:', error);
        toast({
          title: "File upload failed",
          description: "Could not upload file. Message sent without attachment.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setFile(null);
      }
    }
    
    // Optimistically add the message
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      home_id: currentHomeId,
      user_id: user.id,
      content: newMessage,
      file_url,
      created_at: new Date().toISOString(),
      profiles: { 
        name: userProfile?.name || user.user_metadata?.name || user.email || 'You', 
        avatar_url: userProfile?.avatar_url || user.user_metadata?.avatar_url || '' 
      },
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    scrollToBottom();
    
    // Send to database
    const { error: dbError } = await supabase.from('messages').insert({
      home_id: currentHomeId,
      user_id: user.id,
      content: optimisticMsg.content,
      file_url: optimisticMsg.file_url,
    });
    
    if (dbError) {
      console.error('Database error:', dbError);
      toast({
        title: "Message failed to send",
        description: "Please try again.",
        variant: "destructive",
      });
      // Remove the optimistic message if database insert failed
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id));
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    
    const { error } = await supabase
      .from('messages')
      .update({ content: editContent.trim() })
      .eq('id', editingMessageId)
      .eq('user_id', user?.id);

    if (!error) {
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editContent.trim() }
          : msg
      ));
    }
    
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ deleted: true })
      .eq('id', messageId)
      .eq('user_id', user?.id);

    if (!error) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, deleted: true }
          : msg
      ));
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const onEditEmojiClick = (emojiObject: any) => {
    setEditContent(prev => prev + emojiObject.emoji);
    setShowEditEmojiPicker(false);
  };

  const handleTouchStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setLongPressMessageId(messageId);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900/30">
      {/* Enhanced Header - Mobile Responsive */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border-b border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all duration-300">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm sm:text-lg">💬</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Home Chat
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {messages.length} messages • Real-time
                </p>
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 sm:px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
                {unreadCount} new
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Messages Container - Mobile Responsive */}
      <div 
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-transparent via-white/20 to-white/10 dark:via-slate-800/10 dark:to-slate-900/10" 
        ref={messagesContainerRef} 
        onScroll={handleScroll}
      >
        {messages.map((msg, index) => {
          const isMe = msg.user_id === user?.id;
          const isImage = msg.file_url && (
            msg.file_url.endsWith('.jpg') || 
            msg.file_url.endsWith('.jpeg') || 
            msg.file_url.endsWith('.png') || 
            msg.file_url.endsWith('.gif') ||
            msg.file_url.startsWith('data:image/')
          );
          const isOptimistic = msg.id.startsWith('optimistic-');
          const isEditing = editingMessageId === msg.id;
          const isHovered = hoveredMessageId === msg.id;
          
          return (
            <div 
              key={msg.id} 
              className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-700 ease-out`}
              style={{ animationDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 sm:gap-3 w-full group`}>
                {/* Message Content Container */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] transition-all duration-300`}>
                  {/* Name and Avatar for others */}
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-2 animate-in fade-in-50 slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 100 + 300}ms` }}>
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ring-2 ring-blue-200/50 dark:ring-blue-800/30 transition-all duration-300 hover:ring-blue-400/50 hover:scale-110 shadow-lg">
                        <AvatarImage 
                          src={msg.profiles?.avatar_url} 
                          alt={`${msg.profiles?.name || 'User'}'s avatar`}
                          onError={(e) => {
                            // Hide the image on error to show fallback
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-xs">
                          {msg.profiles?.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-300 dark:to-slate-400 bg-clip-text text-transparent">
                        {msg.profiles?.name || 'Unknown'}
                      </span>
                    </div>
                  )}

                  {/* Name and Avatar for own messages */}
                  {isMe && (
                    <div className="flex items-center gap-2 mb-2 animate-in fade-in-50 slide-in-from-right-2 duration-300" style={{ animationDelay: `${index * 100 + 300}ms` }}>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-300 dark:to-slate-400 bg-clip-text text-transparent">
                        You
                      </span>
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ring-2 ring-blue-200/50 dark:ring-blue-800/30 transition-all duration-300 hover:ring-blue-400/50 hover:scale-110 shadow-lg">
                        <AvatarImage 
                          src={userProfile?.avatar_url} 
                          alt="Your avatar"
                          onError={(e) => {
                            // Hide the image on error to show fallback
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold text-xs">
                          {userProfile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div 
                    className={`relative group ${isMe ? 'ml-auto' : 'mr-auto'} w-fit max-w-full`}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                  >
                    {/* Three-dot Menu for Actions - Desktop */}
                    {isMe && !msg.deleted && (
                      <div className={`absolute ${isMe ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 sm:h-8 sm:w-8 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 shadow-lg border border-slate-200/50 dark:border-slate-600/50 rounded-lg transition-all duration-200 hover:scale-110"
                            >
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50" align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEditMessage(msg)}
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="text-sm">Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="text-sm">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {/* Long Press Menu - Mobile */}
                    {isMe && !msg.deleted && longPressMessageId === msg.id && (
                      <div className="absolute inset-0 bg-black/10 dark:bg-black/20 rounded-2xl flex items-center justify-center z-20 sm:hidden">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-600/50 p-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditMessage(msg);
                              setLongPressMessageId(null);
                            }}
                            className="h-8 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-200"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleDeleteMessage(msg.id);
                              setLongPressMessageId(null);
                            }}
                            className="h-8 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all duration-200"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLongPressMessageId(null)}
                            className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className={`relative rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-lg transition-all duration-300 ${
                      isMe 
                        ? 'bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white' 
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    } ${msg.content?.match(/^[\p{Emoji}\s]+$/u) ? 'bg-white dark:bg-slate-800' : ''}`}>
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              className="flex-1 text-sm sm:text-base bg-white/20 dark:bg-slate-700/20 border-white/30 dark:border-slate-600/30 text-white dark:text-slate-100 placeholder:text-white/70 dark:placeholder:text-slate-400"
                              placeholder="Edit your message..."
                              autoFocus
                            />
                            <Popover open={showEditEmojiPicker} onOpenChange={setShowEditEmojiPicker}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/20 hover:bg-white/30 text-white hover:text-white/80 transition-all duration-200"
                                >
                                  <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 border-white/20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm" align="end">
                                <EmojiPicker
                                  onEmojiClick={onEditEmojiClick}
                                  width={280}
                                  height={350}
                                  searchDisabled={false}
                                  skinTonesDisabled={false}
                                  lazyLoadEmojis={true}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-7 sm:h-8 px-3 sm:px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-7 sm:h-8 px-3 sm:px-4 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-xs sm:text-sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content && (
                            <div className={`leading-relaxed whitespace-pre-wrap break-words font-medium ${
                              msg.content.match(/^[\p{Emoji}\s]+$/u) ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'
                            }`}>
                              {msg.content}
                            </div>
                          )}
                          {msg.file_url && isImage && (
                            <div className="relative group/image mt-3">
                              <img 
                                src={msg.file_url} 
                                alt="attachment" 
                                className="rounded-xl max-w-[240px] sm:max-w-[280px] max-h-[160px] sm:max-h-[200px] object-cover transition-all duration-300 hover:scale-105 shadow-lg" 
                                onError={(e) => {
                                  // Hide the image on error to show fallback
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-300 rounded-xl"></div>
                            </div>
                          )}
                          {msg.file_url && !isImage && (
                            <div className="mt-3 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                {msg.file_url.startsWith('data:image/') ? (
                                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : msg.file_url.startsWith('data:video/') ? (
                                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                ) : msg.file_url.startsWith('data:audio/') ? (
                                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                ) : msg.file_url.includes('pdf') || msg.file_url.includes('document') ? (
                                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : (
                                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                  Attached File
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Click to view or download
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create a download link for base64 files
                                  const link = document.createElement('a');
                                  link.href = msg.file_url;
                                  link.download = 'attachment';
                                  link.click();
                                }}
                                className="h-7 sm:h-8 px-2 sm:px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-xs"
                              >
                                Download
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Time and Status - Mobile Responsive */}
                    <div className={`flex items-center gap-2 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && !msg.deleted && (
                        <div className="flex items-center gap-1">
                          <CheckCheck className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Enhanced Typing indicator */}
        {isTyping && (
          <div className="w-full flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-500">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-blue-200/50 dark:ring-blue-800/30">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                ?
              </AvatarFallback>
            </Avatar>
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Enhanced Scroll to bottom button - Mobile Responsive */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 hover:scale-110 animate-in slide-in-from-bottom-4 duration-300 z-50"
        >
          <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}
      
      {/* Enhanced Input Bar - Mobile Responsive */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-700/50 px-3 sm:px-6 py-3 sm:py-4">
        <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 items-end">
          <div className="flex gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 shadow-sm"
                >
                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50" align="start">
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setFile(file);
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Take Photo</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Use camera to take a photo</div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setFile(file);
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Photo Library</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Choose from your gallery</div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.doc,.docx,.txt,.rtf';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setFile(file);
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Document</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">PDF, Word, or text files</div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setFile(file);
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Video</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Share a video file</div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setFile(file);
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Audio</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Share an audio file</div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        // For now, just take the first file. We can enhance this later for multiple files
                        setFile(files[0]);
                        if (files.length > 1) {
                          toast({
                            title: "Multiple files selected",
                            description: `Only the first file (${files[0].name}) will be sent. Multiple file support coming soon!`,
                          });
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Browse Files</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Choose any file from device</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 shadow-sm"
                >
                  <Smile className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm" align="start">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={320}
                  height={350}
                  searchDisabled={false}
                  skinTonesDisabled={false}
                  lazyLoadEmojis={true}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-sm sm:text-base bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 rounded-xl min-h-[40px] sm:min-h-[44px] shadow-sm"
            disabled={uploading}
          />
          <Button 
            type="submit" 
            disabled={uploading || (!newMessage && !file)} 
            size="icon" 
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-105 shadow-lg flex-shrink-0 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </form>
        {file && (
          <div className="mt-3 flex items-center gap-2 sm:gap-3 text-sm text-slate-600 dark:text-slate-400 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-2 sm:p-3 border border-slate-200/50 dark:border-slate-600/50 max-w-full overflow-hidden">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
              {file.type.startsWith('image/') ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : file.type.startsWith('video/') ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : file.type.startsWith('audio/') ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ) : file.type.includes('pdf') || file.type.includes('document') ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">
                {file.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFile(null)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors duration-200 flex-shrink-0"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 