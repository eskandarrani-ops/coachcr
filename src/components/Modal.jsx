import { useEffect } from 'react'

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    // z-[60] sits above the bottom nav (z-50) so the nav never covers the modal
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/*
        On mobile:
          - mb-16 (64 px) lifts the sheet above the bottom nav
          - max-h is viewport minus that same offset so the sheet never overflows upward
        On sm+ (desktop/tablet):
          - mb-0, centered, max-h-[90svh]
      */}
      <div className="
        bg-slate-800 w-full flex flex-col
        rounded-t-2xl mb-16 max-h-[calc(100svh-4rem)]
        sm:rounded-2xl sm:mb-0 sm:max-w-lg sm:max-h-[90svh]
      ">
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Scrollable form content */}
        <div className="overflow-y-auto flex-1 p-4">
          {children}
        </div>

        {/* Sticky action footer — never scrolled away */}
        {footer && (
          <div
            className="flex-shrink-0 px-4 pt-3 pb-5 border-t border-slate-700 bg-slate-800"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
