import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import useAuth from '../hooks/useAuth';

const UserMenuContainer = styled.div`
  position: relative;
`;

const UserAvatar = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const AvatarImage = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
`;

const UserName = styled.span`
  font-weight: 500;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background-color: var(--surface);
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 200px;
  overflow: hidden;
  z-index: 100;
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  opacity: ${props => props.isOpen ? 1 : 0};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s;
`;

const UserInfo = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--border);
`;

const UserEmail = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  text-align: left;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    margin-right: 0.75rem;
    color: var(--text-secondary);
  }
  
  &.danger {
    color: var(--error);
    
    svg {
      color: var(--error);
    }
  }
`;

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Função para gerar as iniciais do nome
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  // Função para obter o primeiro nome
  const getFirstName = (name: string) => {
    if (!name) return 'Usuário';
    return name.split(' ')[0];
  };
  
  // Fechar o menu quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!usuario) return null;
  
  return (
    <UserMenuContainer ref={menuRef}>
      <UserAvatar onClick={() => setIsOpen(!isOpen)}>
        <AvatarImage>
          {getInitials(usuario.nome)}
        </AvatarImage>
        <UserName>{getFirstName(usuario.nome)}</UserName>
      </UserAvatar>
      
      <DropdownMenu isOpen={isOpen}>
        <UserInfo>
          <UserName>{usuario.nome}</UserName>
          <UserEmail>{usuario.email}</UserEmail>
        </UserInfo>
        
        <MenuItem>
          <FiUser size={16} />
          Meu Perfil
        </MenuItem>
        
        <MenuItem>
          <FiSettings size={16} />
          Configurações
        </MenuItem>
        
        <MenuItem className="danger" onClick={() => { setIsOpen(false); logout(); }}>
          <FiLogOut size={16} />
          Sair
        </MenuItem>
      </DropdownMenu>
    </UserMenuContainer>
  );
} 