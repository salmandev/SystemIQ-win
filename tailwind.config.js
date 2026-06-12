/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fluent: {
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary': 'var(--bg-tertiary)',
          'bg-card': 'var(--bg-card)',
          'bg-hover': 'var(--bg-hover)',
          'bg-active': 'var(--bg-active)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'border': 'var(--border)',
          'border-subtle': 'var(--border-subtle)',
          'success': 'var(--success)',
          'warning': 'var(--warning)',
          'error': 'var(--error)',
          'info': 'var(--info)',
          'mica': 'var(--mica)',
          'smoke': 'var(--smoke)',
        }
      },
      fontFamily: {
        'segoe': ['Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'fluent': '8px',
        'fluent-lg': '12px',
        'fluent-xl': '16px',
      },
      boxShadow: {
        'fluent': '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'fluent-lg': '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'fluent-xl': '0 16px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.1)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'progress': 'progressBar 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        progressBar: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' }
        }
      },
      backdropBlur: {
        fluent: '20px',
      }
    }
  },
  plugins: []
}
