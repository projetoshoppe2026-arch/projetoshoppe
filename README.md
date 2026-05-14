# 📦 Shopee Manager

Sistema de gestão de produtos para marketplace Shopee com precificação automática, controle de estoque e análise de margens.

## Stack

- **Frontend:** React 19 + Vite
- **Backend/DB:** Supabase (PostgreSQL)
- **Deploy:** Vercel / GitHub Pages

## Setup

```bash
# Clonar
git clone git@github-shopee:projetoshoppe2026-arch/projetoshoppe.git
cd projetoshoppe

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais do Supabase

# Rodar localmente
npm run dev
```

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

## Features

- ✅ CRUD completo de produtos
- ✅ Precificação automática com fórmula Shopee (comissão 20% + taxa fixa + frete + imposto)
- ✅ Indicador de margem em tempo real (verde/amarelo/vermelho)
- ✅ Filtros por status e lote de prioridade
- ✅ Busca por nome ou SKU
- ✅ Exportação CSV
- ✅ Dark mode automático
- ✅ Responsivo (mobile)

## Deploy no GitHub Pages

```bash
npm run build
# O build gera a pasta dist/
# Usar GitHub Actions para deploy automático
```

## Banco de Dados

Rodar o arquivo `supabase_schema.sql` no SQL Editor do Supabase para criar as tabelas.

## PRODUTOS ADICIONADOS AO DASHBOARD - CATEGORIAS:
✅ ACESSORIOS PARA VEICULOS
✅ AGRO
