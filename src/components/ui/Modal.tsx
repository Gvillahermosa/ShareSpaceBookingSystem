import type { ReactNode } from 'react';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useCustomHooks';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    children,
    title,
    size = 'md',
    showCloseButton = true,
}: ModalProps) {
    useScrollLock(isOpen);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full mx-4',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={`
                        relative bg-white rounded-2xl shadow-2xl
                        w-full ${sizes[size]}
                        transform transition-all
                        animate-in fade-in zoom-in-95 duration-200
                        ring-1 ring-secondary-200/50
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button - always on top right */}
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-secondary-100 hover:bg-secondary-200 transition-colors group"
                        >
                            <svg
                                className="w-5 h-5 text-secondary-500 group-hover:text-secondary-700"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Header (optional title) */}
                    {title && (
                        <div className="px-6 pt-6 pb-0 border-b border-secondary-100">
                            <h2 className="text-xl font-bold text-secondary-900 pr-10">
                                {title}
                            </h2>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6">{children}</div>
                </div>
            </div>
        </div>,
        document.body
    );
}

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    position?: 'left' | 'right';
}

export function Drawer({
    isOpen,
    onClose,
    children,
    title,
    position = 'right',
}: DrawerProps) {
    useScrollLock(isOpen);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const positionStyles = {
        left: 'left-0',
        right: 'right-0',
    };

    const slideStyles = {
        left: isOpen ? 'translate-x-0' : '-translate-x-full',
        right: isOpen ? 'translate-x-0' : 'translate-x-full',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`
          fixed top-0 bottom-0 w-full max-w-md bg-white shadow-xl
          ${positionStyles[position]}
          ${slideStyles[position]}
          transition-transform duration-300 ease-in-out
        `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-secondary-200">
                    {title && (
                        <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-secondary-100 transition-colors"
                    >
                        <svg
                            className="w-6 h-6 text-secondary-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">{children}</div>
            </div>
        </div>,
        document.body
    );
}

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const alignStyles = {
        left: 'left-0',
        right: 'right-0',
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

            {isOpen && (
                <div
                    className={`
            absolute z-50 mt-2 w-56 rounded-xl bg-white shadow-dropdown
            ${alignStyles[align]}
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
                >
                    <div
                        className="py-1"
                        onClick={() => setIsOpen(false)}
                    >
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

interface DropdownItemProps {
    children: ReactNode;
    onClick?: () => void;
    icon?: ReactNode;
    danger?: boolean;
}

export function DropdownItem({
    children,
    onClick,
    icon,
    danger = false,
}: DropdownItemProps) {
    return (
        <button
            onClick={onClick}
            className={`
        w-full px-4 py-2 text-left flex items-center space-x-2
        transition-colors
        ${danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-secondary-700 hover:bg-secondary-100'
                }
      `}
        >
            {icon && <span className="w-5 h-5">{icon}</span>}
            <span>{children}</span>
        </button>
    );
}

interface TooltipProps {
    children: ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({
    children,
    content,
    position = 'top',
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const positionStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`
            absolute z-50 px-2 py-1 text-sm text-white bg-secondary-800 rounded
            whitespace-nowrap
            ${positionStyles[position]}
          `}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
