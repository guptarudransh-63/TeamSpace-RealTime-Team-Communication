import React, { useRef, useEffect } from 'react';

const COMMON_EMOJIS = [
  '👍', '❤️', '🔥', '🎉', '🚀', '👀', '💯', '👏',
  '🙌', '😂', '💡', '✅', '✨', '⚡', '🤩', '😎',
  '☕', '🍕', '💻', '🎯', '💪', '🤝', '🥳', '🌟',
];

export const EmojiPickerPopover = ({ onSelect, onClose, position = 'bottom' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute z-50 bg-[#222529] border border-[#3A3D44] rounded-xl shadow-2xl p-2.5 w-64 ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      } right-0`}
    >
      <div className="text-[11px] font-semibold text-[#8C9098] px-1 mb-2 uppercase tracking-wider">
        Quick Reactions
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-[#2F3238] hover:scale-110 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
