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
        sm: 'max-w-md w-[calc(100%-2rem)]',
        md: 'max-w-lg w-[calc(100%-2rem)]',
        lg: 'max-w-2xl w-[calc(100%-2rem)]',
        xl: 'max-w-4xl w-[calc(100%-2rem)]',
        full: 'max-w-full w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)]',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <div
                    className={`
                        relative bg-white rounded-xl sm:rounded-2xl shadow-2xl
                        ${sizes[size]}
                        transform transition-all
                        animate-in fade-in zoom-in-95 duration-200
                        ring-1 ring-secondary-200/50
                        max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]
                        max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]
                        overflow-y-auto overscroll-contain
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

// Confirm Dialog Component
interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            iconBg: 'bg-red-100',
            button: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: (
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            iconBg: 'bg-yellow-100',
            button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        },
        info: {
            icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            iconBg: 'bg-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
        },
    };

    const styles = variantStyles[variant];

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6">
                        {/* Icon */}
                        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg} mb-4`}>
                            {styles.icon}
                        </div>

                        {/* Content */}
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                                {title}
                            </h3>
                            <p className="text-secondary-600">
                                {message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 border border-secondary-300 text-secondary-700 rounded-lg font-medium hover:bg-secondary-50 transition-colors disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${styles.button}`}
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
