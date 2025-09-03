{/*

<CardContent className="p-6 h-auto">
  <div className="flex items-center gap-2 mb-3">
    <MessageCircle className="w-4 h-4 text-neutral-400" />
    <span className="text-sm text-neutral-300 font-medium">Make Changes</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setChatMessages([])}
      className="ml-auto text-neutral-500 hover:text-neutral-300 p-1"
      title="Clear chat"
    >
      <RefreshCw className="w-3 h-3" />
    </Button>
  </div>

  <div className="flex-1 overflow-y-auto max-h-48 mb-3 space-y-2">
    {chatMessages.map((message) => (
      <div
        key={message.id}
        className={`flex ${
          message.type === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
            message.type === "user"
              ? "bg-blue-600 text-white"
              : "bg-neutral-800 text-neutral-200 border border-neutral-700"
          }`}
        >
          {message.isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              {message.content}
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    ))}
    <div ref={chatMessagesEndRef} />
  </div>

  <form onSubmit={handleChatSubmit} className="flex gap-2">
    <input
      type="text"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      placeholder="Ask me to modify the images..."
      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
      disabled={isChatProcessing}
    />
    <Button
      type="submit"
      disabled={!chatInput.trim() || isChatProcessing}
      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isChatProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
    </Button>
  </form>

  <div className="flex flex-wrap gap-1 mt-2">
    {[
      "Make it brighter",
      "Add more contrast",
      "Change colors",
      "Add text overlay",
      "Make it more vibrant",
    ].map((suggestion) => (
      <Button
        key={suggestion}
        variant="ghost"
        size="sm"
        onClick={() => setChatInput(suggestion)}
        className="text-xs px-2 py-1 h-6 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
        disabled={isChatProcessing}
      >
        {suggestion}
      </Button>
    ))}
  </div>
</CardContent>;

*/}
