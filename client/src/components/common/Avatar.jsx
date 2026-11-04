import React from 'react';

const COLORS = [
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-purple-600',
  'bg-teal-600',
];

const getColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  presence = null,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const badgeSizes = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1.5',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-5 h-5 ring-2',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colorClass = getColor(name);

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-lg object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${colorClass} rounded-lg flex items-center justify-center text-white font-medium shadow-inner`}
        >
          {initials || '?'}
        </div>
      )}

      {presence && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-[#1A1D21] ${
            badgeSizes[size]
          } ${
            presence === 'online'
              ? 'bg-emerald-500'
              : presence === 'away'
              ? 'bg-amber-400'
              : 'bg-zinc-500'
          }`}
          title={presence}
        />
      )}
    </div>
  );
};
