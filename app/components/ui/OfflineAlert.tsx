import React from 'react';
import styled from 'styled-components';
import { FiWifiOff } from 'react-icons/fi';

interface OfflineAlertProps {
  fullWidth?: boolean;
  message?: string;
  className?: string;
}

const OfflineAlert: React.FC<OfflineAlertProps> = ({
  fullWidth = false,
  message = 'Modo offline - Algumas funcionalidades estão limitadas',
  className
}) => {
  return (
    <StyledOfflineAlert fullWidth={fullWidth} className={className}>
      <FiWifiOff size={16} />
      <span>{message}</span>
    </StyledOfflineAlert>
  );
};

const StyledOfflineAlert = styled.div<{ fullWidth: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 193, 7, 0.15);
  color: #856404;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  svg {
    flex-shrink: 0;
  }
`;

export default OfflineAlert; 