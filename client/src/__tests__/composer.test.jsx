import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageComposer } from '../components/chat/MessageComposer.jsx';

// Mock context and stores
vi.mock('../context/SocketContext.jsx', () => ({
  useSocket: () => ({ socket: { emit: vi.fn() } }),
}));

vi.mock('../store/authStore.js', () => ({
  useAuthStore: () => ({
    user: { _id: 'user1', displayName: 'alex' },
    currentWorkspace: { _id: 'ws1', name: 'Acme' },
  }),
}));

vi.mock('../store/channelStore.js', () => ({
  useChannelStore: () => ({
    currentChannel: { _id: 'chan1', name: 'general' },
    activeView: 'channel',
    addMessage: vi.fn(),
    addThreadReply: vi.fn(),
  }),
}));

vi.mock('../store/uiStore.js', () => ({
  useUIStore: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { members: [] } }),
    post: vi.fn().mockResolvedValue({ data: { message: { _id: 'm1' } } }),
  },
}));

describe('MessageComposer', () => {
  it('renders input placeholder with channel name', () => {
    render(<MessageComposer />);
    const textarea = screen.getByPlaceholderText('Message #general');
    expect(textarea).toBeInTheDocument();
  });

  it('updates text on typing', () => {
    render(<MessageComposer />);
    const textarea = screen.getByPlaceholderText('Message #general');
    fireEvent.change(textarea, { target: { value: 'Hello team!' } });
    expect(textarea.value).toBe('Hello team!');
  });

  it('applies formatting when formatting buttons are clicked', () => {
    render(<MessageComposer />);
    const textarea = screen.getByPlaceholderText('Message #general');
    const boldButton = screen.getByTitle('Bold (**text**)');

    fireEvent.click(boldButton);
    expect(textarea.value).toContain('**');
  });
});
