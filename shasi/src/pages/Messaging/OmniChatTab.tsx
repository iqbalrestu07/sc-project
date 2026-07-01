import { useState, useEffect, useRef } from 'react';
import { useOmniChat } from '../../hooks/useOmniChat';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function OmniChatTab() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [messageText, setMessageText] = useState('');
  
  const {
    conversations,
    isConversationsLoading,
    messages,
    isMessagesLoading,
    sendMessage,
    markAsRead
  } = useOmniChat(selectedConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConversationId) {
      const conv = conversations?.find(c => c.id === selectedConversationId);
      if (conv && conv.unread_count > 0) {
        markAsRead.mutate(selectedConversationId);
      }
    }
  }, [selectedConversationId, conversations, markAsRead]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConversationId) return;
    sendMessage.mutate({ content: messageText }, {
      onSuccess: () => setMessageText('')
    });
  };

  const selectedConv = conversations?.find(c => c.id === selectedConversationId);

  return (
    <div className="grid grid-cols-12 gap-6 h-[700px]">
      {/* Conversations List */}
      <Card className="col-span-4 flex flex-col overflow-hidden bg-white/50 backdrop-blur-xl border-white/20 shadow-xl">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Inbox 
            {conversations && conversations.filter(c => c.unread_count > 0).length > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                {conversations.filter(c => c.unread_count > 0).length} New
              </Badge>
            )}
          </h3>
        </div>
        <ScrollArea className="flex-1">
          {isConversationsLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : conversations?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
          ) : (
            <div className="divide-y">
              {conversations?.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                    selectedConversationId === conv.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conv.customer_name ? conv.customer_name.substring(0, 2).toUpperCase() : <User size={16} />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-medium text-sm truncate pr-2">
                        {conv.customer_name || conv.customer_identifier}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm') : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {conv.last_message_content || 'Photo/Media'}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary h-5 min-w-5 flex items-center justify-center rounded-full px-1 text-[10px]">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Window */}
      <Card className="col-span-8 flex flex-col overflow-hidden bg-white/50 backdrop-blur-xl border-white/20 shadow-xl">
        {selectedConversationId ? (
          <>
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConv?.customer_name ? selectedConv.customer_name.substring(0, 2).toUpperCase() : <User size={16} />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedConv?.customer_name || selectedConv?.customer_identifier}</h3>
                  <p className="text-xs text-muted-foreground">{selectedConv?.customer_identifier}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white/50">
                {selectedConv?.platform}
              </Badge>
            </div>
            
            <ScrollArea className="flex-1 p-4 bg-muted/10">
              <div className="space-y-4">
                {isMessagesLoading ? (
                  <div className="text-center text-muted-foreground text-sm mt-4">Loading messages...</div>
                ) : (
                  messages?.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                            isOutbound
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-white border rounded-tl-sm'
                          }`}
                        >
                          {msg.content_type === 'image' && (
                             <div className="mb-2 rounded overflow-hidden">
                                <span className="text-xs italic opacity-70">📷 Image received</span>
                             </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                          {isOutbound && (
                            msg.status === 'read' ? <CheckCheck size={12} className="text-blue-500" /> :
                            msg.status === 'delivered' ? <CheckCheck size={12} /> :
                            <Check size={12} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-end gap-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full shadow-sm"
                  disabled={sendMessage.isPending}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full h-10 w-10 shadow-sm"
                  disabled={!messageText.trim() || sendMessage.isPending}
                >
                  <Send size={16} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Send size={32} className="opacity-50" />
            </div>
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </Card>
    </div>
  );
}
