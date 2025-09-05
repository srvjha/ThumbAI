import React, { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  X,
  MessageCircle,
  Minimize2,
  Maximize2,
  RefreshCcw,
  Copy,
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import { Response } from "./ai-elements/response";
import { Action, Actions } from "./ai-elements/actions";
import { Loader } from "./ai-elements/loader";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "./ai-elements/prompt-input";
import { UIMessage } from "ai";

interface PopoutChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: UIMessage[];
  onSendMessage: (input: string) => Promise<void>;
  onRegenerate: () => void;
  chatStatus: any;
  isGenerating: boolean;
}

interface ChatToggleButtonProps {
  onClick: () => void;
  hasMessages: boolean;
  isGenerating: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const PopoutChat: React.FC<PopoutChatProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onRegenerate,
  chatStatus,
  isGenerating,
}) => {
  const [input, setInput] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 100 });
  const [size, setSize] = useState<Size>({ width: 400, height: 400 });
  const [isClient, setIsClient] = useState(false);

  // Initialize position after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      setPosition({ x: window.innerWidth - 500, y: 75 });
    }
  }, []);

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSendMessage(input);
    setInput("");
  };

  // Don't render until we're on the client side
  if (!isOpen || !isClient) return null;

  return (
    <Rnd
      dragHandleClassName="chat-drag-handle"
      size={isMinimized ? { width: 320, height: 50 } : size}
      position={position}
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, pos) => {
        if (!isMinimized) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(pos);
        }
      }}
      minWidth={300}
      minHeight={isMinimized ? 50 : 400}
      maxWidth={600}
      maxHeight={800}
      bounds="window"
      className="z-50"
      disableDragging={false}
      enableResizing={!isMinimized}
    >
      <div className="bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl h-full flex flex-col">
        {/* Header */}
        <div className="chat-drag-handle flex items-center justify-between p-3 border-b border-neutral-700 bg-neutral-900/40 rounded-t-lg cursor-move">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-neutral-200">
              AI Assistant
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 hover:bg-neutral-700"
            >
              {isMinimized ? (
                <Maximize2 className="h-3 w-3 text-neutral-400" />
              ) : (
                <Minimize2 className="h-3 w-3 text-neutral-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-neutral-700"
            >
              <X className="h-3 w-3 text-neutral-400" />
            </Button>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <div className="flex flex-col h-full">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="flex p-4 justify-center items-center text-center text-sm text-gray-400">
                Great! I've generated your images. What modifications would you
                like to make? <br />
                <span className="mt-2 block text-xs text-gray-500">
                  ⚠️ Currently, image upload is not supported. You can only edit
                  the generated images through this chat.
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <Conversation className="h-full">
                <ConversationContent>
                  {messages.map((message) => (
                    <div key={message.id}>
                      <Message from={message.role}>
                        <div className="flex items-start space-x-2">
                          {message.role === "assistant" && (
                            <img
                              className="w-6 h-6 rounded-full flex-shrink-0"
                              src="https://res.cloudinary.com/sauravjha/image/upload/v1756884339/Chatbot_img-removebg-preview_hrars9.png"
                              alt="Assistant"
                            />
                          )}

                          <MessageContent className="flex-1 select-text">
                            {message.parts.map((part, i) => {
                              switch (part.type) {
                                case "text":
                                  const isLastMessage =
                                    messages[messages.length - 1].id ===
                                    message.id;
                                  return (
                                    <div key={`${message.id}-${i}`}>
                                      <Response>{part.text}</Response>
                                      {message.role === "assistant" &&
                                        isLastMessage && (
                                          <Actions className="mt-2">
                                            <Action
                                              onClick={() => onRegenerate()}
                                              label="Retry"
                                            >
                                              <RefreshCcw className="size-3" />
                                            </Action>
                                            <Action
                                              onClick={() =>
                                                navigator.clipboard.writeText(
                                                  part.text
                                                )
                                              }
                                            >
                                              <Copy className="size-3" />
                                            </Action>
                                          </Actions>
                                        )}
                                    </div>
                                  );
                                default:
                                  return null;
                              }
                            })}
                          </MessageContent>

                          {message.role === "user" && (
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage
                                src="https://avatar.iran.liara.run/public/32"
                                alt="User"
                              />
                              <AvatarFallback className="text-xs">
                                U
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </Message>
                    </div>
                  ))}
                  {chatStatus === "submitted" && <Loader />}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>

            {/* Input */}
            <div className="border-t border-neutral-700 p-3">
              <PromptInput onSubmit={handleChatSubmit} className="flex">
                <PromptInputTextarea
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInput(e.target.value)
                  }
                  value={input}
                  placeholder="Ask me to modify your images..."
                  className="min-h-[60px] bg-neutral-800 text-sm"
                />
                <PromptInputToolbar>
                  <PromptInputSubmit disabled={!input || isGenerating} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        )}
      </div>
    </Rnd>
  );
};

// Chat Toggle Button Component
export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  onClick,
  hasMessages,
  isGenerating,
}) => (
  <div className="fixed bottom-6 right-6 z-40">
    <Button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg relative cursor-pointer"
    >
      <MessageCircle className="w-6 h-6" /> Customize your image
      {hasMessages && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
      )}
    </Button>
  </div>
);
