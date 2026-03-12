import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';

/**
 * Trap focus inside a container.
 * @param {HTMLElement} container
 * @param {KeyboardEvent} e
 */
function handleFocusTrap(container, e) {
    if (e.key !== 'Tab') return;

    /** @type {HTMLElement[]} */
    const focusables = Array.from(
        container.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
    ).filter((el) => !el.hasAttribute('aria-hidden'));

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
        if (active === first || active === container) {
            e.preventDefault();
            last.focus();
        }
    } else if (active === last) {
        e.preventDefault();
        first.focus();
    }
}

/**
 * PUBLIC_INTERFACE
 * Accessible modal dialog with focus management.
 * @param {{
 *   open: boolean,
 *   title: string,
 *   children: any,
 *   onClose: function(): void,
 *   footer: any,
 * }} props
 * @return {JSX.Element|null}
 */
function Modal(props) {
    const {open, title, children, onClose, footer} = props;
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocusedRef.current = document.activeElement;
        window.setTimeout(() => {
            if (dialogRef.current) {
                /** @type {HTMLElement|null} */
                const autofocus = dialogRef.current.querySelector('[data-autofocus="true"]');
                if (autofocus) {
                    autofocus.focus();
                } else {
                    dialogRef.current.focus();
                }
            }
        }, 0);

        return () => {
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') {
                prev.focus();
            }
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        /**
         * @param {KeyboardEvent} e
         */
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (dialogRef.current) {
                handleFocusTrap(dialogRef.current, e);
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="modalOverlay" role="presentation" onMouseDown={onClose}>
            <div
                className="modalDialog"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                ref={dialogRef}
                tabIndex={-1}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="modalHeader">
                    <h2 className="modalTitle">{title}</h2>
                    <button className="iconButton" onClick={onClose} aria-label="Close dialog" data-autofocus="true">
                        ✕
                    </button>
                </div>
                <div className="modalBody">{children}</div>
                {footer ? <div className="modalFooter">{footer}</div> : null}
            </div>
        </div>
    );
}

Modal.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    children: PropTypes.node,
    onClose: PropTypes.func.isRequired,
    footer: PropTypes.node,
};

export default Modal;
