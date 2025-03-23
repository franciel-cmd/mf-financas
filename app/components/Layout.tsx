import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiHome, FiFileText, FiBarChart2, FiCalendar, FiCheckCircle, FiAlertCircle, FiPlusCircle } from 'react-icons/fi';
import styled from 'styled-components';
import UserMenu from './UserMenu';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  width: 250px;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  padding: 2rem 0;
  
  @media (max-width: 768px) {
    width: 100%;
    padding: 1rem 0;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
`;

const LogoContainer = styled.div`
  padding: 0 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 0 1rem 1rem;
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
`;

const NavList = styled.ul`
  list-style: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const NavItem = styled.li`
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    margin: 0 0.25rem 0.5rem;
  }
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background-color: rgba(37, 99, 235, 0.05);
    color: var(--primary);
  }

  &.active {
    background-color: rgba(37, 99, 235, 0.1);
    color: var(--primary);
    border-right: 3px solid var(--primary);
  }

  svg {
    margin-right: 0.75rem;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 0.375rem;
    
    &.active {
      border-right: none;
      border-bottom: 2px solid var(--primary);
    }
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  background-color: var(--background);
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const NavSection = styled.div`
  margin-bottom: 1.5rem;

  h3 {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 0 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
    
    h3 {
      text-align: center;
      padding: 0 1rem;
    }
  }
`;

export default function Layout() {
  return (
    <LayoutContainer>
      <Sidebar>
        <LogoContainer>
          <Logo>MF - Finanças</Logo>
          <UserMenu />
        </LogoContainer>
        
        <NavList>
          <NavItem>
            <StyledNavLink to="/" end>
              <FiHome size={18} /> Dashboard
            </StyledNavLink>
          </NavItem>

          <NavSection>
            <h3>Contas</h3>
            <NavItem>
              <StyledNavLink to="/contas">
                <FiFileText size={18} /> Todas as Contas
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/em-aberto">
                <FiCalendar size={18} /> Em Aberto
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/pagas">
                <FiCheckCircle size={18} /> Pagas
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/vencidas">
                <FiAlertCircle size={18} /> Vencidas
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/cadastrar">
                <FiPlusCircle size={18} /> Cadastrar
              </StyledNavLink>
            </NavItem>
          </NavSection>
          
          <NavSection>
            <h3>Relatórios</h3>
            <NavItem>
              <StyledNavLink to="/relatorios">
                <FiBarChart2 size={18} /> Relatórios
              </StyledNavLink>
            </NavItem>
          </NavSection>
        </NavList>
      </Sidebar>
      <MainContent>
        <Outlet />
      </MainContent>
    </LayoutContainer>
  );
} 