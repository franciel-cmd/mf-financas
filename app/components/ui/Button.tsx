import React, { ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const getColorScheme = (color: string) => {
  switch (color) {
    case 'primary':
      return {
        bg: 'var(--primary)',
        hoverBg: 'var(--primary-dark)',
        text: 'white',
        borderColor: 'var(--primary)'
      };
    case 'secondary':
      return {
        bg: 'var(--secondary)',
        hoverBg: 'var(--secondary-dark)',
        text: 'white',
        borderColor: 'var(--secondary)'
      };
    case 'success':
      return {
        bg: '#16A34A',
        hoverBg: '#15803D',
        text: 'white',
        borderColor: '#16A34A'
      };
    case 'danger':
      return {
        bg: '#EF4444',
        hoverBg: '#DC2626',
        text: 'white',
        borderColor: '#EF4444'
      };
    case 'warning':
      return {
        bg: '#F59E0B',
        hoverBg: '#D97706',
        text: 'white',
        borderColor: '#F59E0B'
      };
    case 'info':
      return {
        bg: '#3B82F6',
        hoverBg: '#2563EB',
        text: 'white',
        borderColor: '#3B82F6'
      };
    default:
      return {
        bg: 'var(--primary)',
        hoverBg: 'var(--primary-dark)',
        text: 'white',
        borderColor: 'var(--primary)'
      };
  }
};

const getSizeStyles = (size: string) => {
  switch (size) {
    case 'sm':
      return {
        padding: '0.375rem 0.75rem',
        fontSize: '0.875rem'
      };
    case 'lg':
      return {
        padding: '0.75rem 1.5rem',
        fontSize: '1.125rem'
      };
    default:
      return {
        padding: '0.5rem 1rem',
        fontSize: '1rem'
      };
  }
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 0.375rem;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  position: relative;

  /* Size styles */
  ${props => {
    const sizeStyles = getSizeStyles(props.size || 'md');
    return `
      padding: ${sizeStyles.padding};
      font-size: ${sizeStyles.fontSize};
    `;
  }}

  /* Color styles */
  ${props => {
    const colorScheme = getColorScheme(props.color || 'primary');
    if (props.variant === 'outline') {
      return `
        background-color: transparent;
        color: ${colorScheme.bg};
        border-color: ${colorScheme.borderColor};

        &:hover:not(:disabled) {
          background-color: ${colorScheme.bg}10;
        }
      `;
    } else {
      return `
        background-color: ${colorScheme.bg};
        color: ${colorScheme.text};
        border-color: ${colorScheme.borderColor};

        &:hover:not(:disabled) {
          background-color: ${colorScheme.hoverBg};
          border-color: ${colorScheme.hoverBg};
        }
      `;
    }
  }}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Loading spinner styles */
  .spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    margin-right: ${props => props.children ? '0.5rem' : '0'};
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  color = 'primary',
  variant = 'solid',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  ...props
}) => {
  return (
    <StyledButton
      color={color}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
    </StyledButton>
  );
}; 