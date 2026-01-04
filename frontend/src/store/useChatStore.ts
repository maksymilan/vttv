import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  role: 'user' | 'model';
  type: 'text' | 'video';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  
  createSession: () => string;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  generateSessionTitle: (sessionId: string, firstMessage: string, model?: string) => Promise<void>;
  getCurrentSession: () => ChatSession | null;
  clearAllSessions: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const newSession: ChatSession = {
          id: Math.random().toString(36).substring(7),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }));
        
        return newSession.id;
      },

      deleteSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentId = state.currentSessionId === sessionId 
            ? (newSessions[0]?.id || null) 
            : state.currentSessionId;
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      setCurrentSession: (sessionId: string) => {
        set({ currentSessionId: sessionId });
      },

      addMessage: (sessionId: string, message: ChatMessage) => {
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id === sessionId) {
              const updatedMessages = [...session.messages, message];
              
              // 如果是第一条用户消息，异步生成智能标题
              if (updatedMessages.length === 1 && message.type === 'text' && message.role === 'user') {
                // 使用异步方式生成标题，不阻塞当前操作
                get().generateSessionTitle(sessionId, message.content);
              }
              
              return {
                ...session,
                messages: updatedMessages,
                updatedAt: Date.now(),
              };
            }
            return session;
          }),
        }));
      },

      updateSessionTitle: (sessionId: string, title: string) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, title } : session
          ),
        }));
      },

      generateSessionTitle: async (sessionId: string, firstMessage: string, model: string = 'gemini-2.0-flash') => {
        try {
          const response = await fetch('http://localhost:8000/api/generate-title', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: firstMessage,
              model: model,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const title = data.title || firstMessage.slice(0, 15) + '...';
            
            set((state) => ({
              sessions: state.sessions.map((session) =>
                session.id === sessionId ? { ...session, title } : session
              ),
            }));
          }
        } catch (error) {
          console.error('生成标题失败:', error);
          // 失败时使用默认标题
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId 
                ? { ...session, title: firstMessage.slice(0, 15) + '...' } 
                : session
            ),
          }));
        }
      },

      getCurrentSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.currentSessionId) || null;
      },

      clearAllSessions: () => {
        set({ sessions: [], currentSessionId: null });
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
