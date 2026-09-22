import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Minus, Move } from 'lucide-react';

interface DraggableWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  initialPosition: { x: number; y: number };
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  id,
  title,
  icon,
  initialPosition,
  onClose,
  children,
  className = '',
  badge,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Mise à jour de la position initiale si elle change et qu'on n'a pas encore déplacé
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Uniquement si on clique sur la barre de titre
      if ((e.target as HTMLElement).closest('button')) {
        return; // Ne pas glisser si on clique sur un bouton de la barre de titre
      }

      setIsDragging(true);
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      // Limiter la fenêtre aux bordures de l'écran avec une marge de sécurité
      const maxX = Math.max(10, window.innerWidth - 80);
      const maxY = Math.max(10, window.innerHeight - 60);

      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(60, Math.min(newY, maxY)),
      });
      e.stopPropagation();
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        setIsDragging(false);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        e.stopPropagation();
      }
    },
    [isDragging]
  );

  return (
    <div
      ref={windowRef}
      id={`window-${id}`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: isDragging ? 50 : 30,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`select-none rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl transition-shadow ${
        isDragging ? 'shadow-cyan-500/20 ring-1 ring-cyan-500/40' : ''
      } ${className}`}
    >
      {/* Barre de titre (Handle de déplacement) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 rounded-t-2xl cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-200 font-medium text-xs tracking-wide">
          <Move className="w-3.5 h-3.5 text-slate-400 opacity-60" />
          {icon}
          <span>{title}</span>
          {badge}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title={isMinimized ? 'Agrandir' : 'Réduire'}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu rétractable */}
      {!isMinimized && <div className="p-3.5">{children}</div>}
    </div>
  );
};
