import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiHome, FiFileText, FiBarChart2, FiCalendar, FiCheckCircle, FiAlertCircle, FiPlusCircle } from 'react-icons/fi';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.aside`
  width: 250px;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  padding: 2rem 0;
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
  padding: 0 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
`;

const NavList = styled.ul`
  list-style: none;
`;

const NavItem = styled.li`
  margin-bottom: 0.5rem;
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
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  background-color: var(--background);
  overflow-y: auto;
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
`;

export default function Layout() {
  return (
    <LayoutContainer>
      <Sidebar>
        <Logo>MF - Finanças</Logo>
        
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
                <FiCalendar size={18} /> Contas em Aberto
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/pagas">
                <FiCheckCircle size={18} /> Contas Pagas
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/vencidas">
                <FiAlertCircle size={18} /> Contas Vencidas
              </StyledNavLink>
            </NavItem>
            <NavItem>
              <StyledNavLink to="/contas/cadastrar">
                <FiPlusCircle size={18} /> Cadastrar Conta
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