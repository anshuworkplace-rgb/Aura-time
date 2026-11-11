import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

export type AuraButtonVariant =
  | 'primary'
  | 'secondary'
  | 'icon'
  | 'subtle'
  | 'danger';
export type AuraButtonSize = 'sm' | 'md' | 'lg';

export interface AuraButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'
  > {
  variant?: AuraButtonVariant;
  size?: AuraButtonSize;
  active?: boolean;
  loading?: boolean;
  magnetic?: boolean;
  ripple?: boolean;
  reducedMotion?: boolean;
  accentColor?: string;
  secondaryColor?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

interface RippleInstance {
  id: number;
  x: number;
  y: number;
}

export const AuraButton = React.forwardRef<HTMLButtonElement, AuraButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      active = false,
      loading = false,
      magnetic = false,
      ripple = true,
      reducedMotion = false,
      accentColor = '#2FE8FF',
      secondaryColor = '#8A5CFF',
      icon,
      children,
      disabled,
      className = '',
      onClick,
      onPointerMove,
      onPointerLeave,
      style,
      ...rest
    },
    externalRef
  ) => {
    const innerRef = useRef<HTMLButtonElement | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [ripples, setRipples] = useState<RippleInstance[]>([]);
    const rippleIdRef = useRef(0);

    const setRefs = (el: HTMLButtonElement | null) => {
      innerRef.current = el;
      if (typeof externalRef === 'function') {
        externalRef(el);
      } else if (externalRef) {
        externalRef.current = el;
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(e);
      if (!magnetic || reducedMotion || disabled || !innerRef.current) return;
      const rect = innerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2 || 1);
      const dy = (e.clientY - cy) / (rect.height / 2 || 1);
      // Clamp subtle magnetic pull to ±4.5px maximum
      setOffset({
        x: Math.max(-4.5, Math.min(4.5, dx * 4.2)),
        y: Math.max(-4.5, Math.min(4.5, dy * 4.2)),
      });
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerLeave?.(e);
      if (offset.x !== 0 || offset.y !== 0) {
        setOffset({ x: 0, y: 0 });
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      if (ripple && !reducedMotion && innerRef.current) {
        const rect = innerRef.current.getBoundingClientRect();
        const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
        const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
        const id = ++rippleIdRef.current;
        setRipples((prev) => [...prev.slice(-2), { id, x, y }]);
        window.setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 540);
      }
      onClick?.(e);
    };

    const sizeClasses: Record<AuraButtonSize, string> = {
      sm:
        variant === 'icon'
          ? 'p-1.5 text-xs rounded-full'
          : 'px-3 py-1.5 text-xs rounded-full gap-1.5',
      md:
        variant === 'icon'
          ? 'p-2 text-xs rounded-full'
          : 'px-4 py-2 text-xs rounded-full gap-2',
      lg:
        variant === 'icon'
          ? 'p-2.5 text-sm rounded-full'
          : 'px-9 py-3 text-sm rounded-full gap-2.5 font-display font-semibold tracking-wide',
    };

    const variantClasses: Record<AuraButtonVariant, string> = {
      primary: active
        ? 'text-[#F5F6FF] border border-white/24 bg-[#0B0E22]/90 hover:bg-[#121631] shadow-lg'
        : 'text-[#070812] border border-white/25 hover:brightness-110 shadow-xl',
      secondary: active
        ? 'bg-[#2FE8FF]/18 text-[#2FE8FF] border border-[#2FE8FF]/45 shadow-md'
        : 'bg-white/[0.045] hover:bg-white/[0.1] text-[#F5F6FF]/90 hover:text-[#F5F6FF] border border-white/10 hover:border-white/20',
      icon: active
        ? 'bg-[#2FE8FF]/18 text-[#2FE8FF] border border-[#2FE8FF]/45'
        : 'bg-transparent hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent hover:border-white/10',
      subtle: active
        ? 'bg-white/[0.1] text-[#2FE8FF] font-medium'
        : 'bg-transparent hover:bg-white/[0.06] text-[#A3A1BA] hover:text-[#F5F6FF]',
      danger:
        'bg-[#FF5D88]/10 hover:bg-[#FF5D88]/20 text-[#FF5D88] border border-[#FF5D88]/30',
    };

    const primaryDynamicStyle: React.CSSProperties =
      variant === 'primary' && !active
        ? {
            background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`,
            boxShadow: `0 10px 32px -6px ${accentColor}58, inset 0 1px 0 0 rgba(255, 255, 255, 0.35)`,
            ...style,
          }
        : {
            boxShadow:
              variant === 'secondary' || (variant === 'primary' && active)
                ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                : undefined,
            ...style,
          };

    return (
      <motion.button
        ref={setRefs}
        type="button"
        disabled={disabled || loading}
        animate={
          reducedMotion
            ? undefined
            : {
                x: offset.x,
                y: offset.y,
              }
        }
        whileTap={
          disabled || loading || reducedMotion
            ? undefined
            : {
                scale: 0.96,
              }
        }
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 26,
          mass: 0.6,
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        style={primaryDynamicStyle}
        className={`relative inline-flex items-center justify-center select-none overflow-hidden transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2FE8FF] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...rest}
      >
        {/* Subtle top liquid-glass specular hairline */}
        {(variant === 'primary' || variant === 'secondary') && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
        )}

        {/* Controlled click-position energy ripples */}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden="true"
            style={{
              left: r.x,
              top: r.y,
              width: 36,
              height: 36,
              background:
                variant === 'primary' && !active
                  ? 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)'
                  : `radial-gradient(circle, ${accentColor}55 0%, transparent 70%)`,
            }}
            className="pointer-events-none absolute rounded-full animate-aura-ripple"
          />
        ))}

        {icon && (
          <span className="relative z-10 inline-flex items-center justify-center shrink-0 transition-transform duration-200">
            {icon}
          </span>
        )}
        {children && (
          <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
            {children}
          </span>
        )}
      </motion.button>
    );
  }
);

AuraButton.displayName = 'AuraButton';
