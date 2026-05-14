-- =============================================
-- SCHEMA: SISTEMA DE GESTÃO SHOPEE
-- Rodar no Supabase SQL Editor
-- =============================================

-- Tabela principal de produtos
CREATE TABLE produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria TEXT,
  subcategoria TEXT,
  custo DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_ml DECIMAL(10,2) DEFAULT 0,
  preco_shopee DECIMAL(10,2) DEFAULT 0,
  margem_shopee DECIMAL(5,2) DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  peso_kg DECIMAL(6,3) DEFAULT 0,
  dimensoes TEXT,
  ean_gtin TEXT,
  fornecedor TEXT,
  prazo_reposicao INTEGER DEFAULT 7,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pronto', 'publicado', 'pausado')),
  lote INTEGER DEFAULT 1 CHECK (lote IN (1, 2, 3)),
  notas TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conteúdo para Shopee
CREATE TABLE conteudo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  titulo_shopee TEXT,
  descricao_shopee TEXT,
  palavras_chave TEXT[], -- array de keywords
  tem_video BOOLEAN DEFAULT FALSE,
  qtd_fotos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_revisao', 'aprovado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de precificação detalhada
CREATE TABLE precos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  canal TEXT NOT NULL CHECK (canal IN ('shopee', 'mercadolivre', 'amazon')),
  custo DECIMAL(10,2) NOT NULL,
  comissao_pct DECIMAL(5,2) NOT NULL,
  taxa_fixa DECIMAL(10,2) DEFAULT 0,
  frete_pct DECIMAL(5,2) DEFAULT 5,
  imposto_pct DECIMAL(5,2) DEFAULT 6,
  margem_desejada_pct DECIMAL(5,2) DEFAULT 20,
  preco_calculado DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN (1 - comissao_pct/100 - frete_pct/100 - imposto_pct/100 - margem_desejada_pct/100) > 0
    THEN ROUND(custo / (1 - comissao_pct/100 - frete_pct/100 - imposto_pct/100 - margem_desejada_pct/100), 2)
    ELSE 0 END
  ) STORED,
  preco_final DECIMAL(10,2),
  lucro_unitario DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN preco_final IS NOT NULL
    THEN ROUND(preco_final - custo - (preco_final * comissao_pct / 100) - taxa_fixa - (preco_final * frete_pct / 100) - (preco_final * imposto_pct / 100), 2)
    ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de vendas (para dashboard futuro)
CREATE TABLE vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  sku TEXT,
  canal TEXT NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER DEFAULT 1,
  receita_bruta DECIMAL(10,2),
  custo_produto DECIMAL(10,2),
  taxas DECIMAL(10,2),
  lucro_liquido DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de concorrência
CREATE TABLE concorrencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  termo_busca TEXT,
  loja_concorrente TEXT,
  titulo_anuncio TEXT,
  preco DECIMAL(10,2),
  num_vendas INTEGER,
  nota DECIMAL(3,1),
  pontos_fortes TEXT,
  pontos_fracos TEXT,
  link TEXT,
  data_coleta DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_produtos_sku ON produtos(sku);
CREATE INDEX idx_produtos_status ON produtos(status);
CREATE INDEX idx_produtos_lote ON produtos(lote);
CREATE INDEX idx_vendas_data ON vendas(data_venda);
CREATE INDEX idx_vendas_sku ON vendas(sku);
CREATE INDEX idx_precos_produto ON precos(produto_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_produtos_modtime
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_conteudo_modtime
  BEFORE UPDATE ON conteudo
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE concorrencia ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (ajustar depois para autenticação)
CREATE POLICY "Acesso total produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total conteudo" ON conteudo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total precos" ON precos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total vendas" ON vendas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total concorrencia" ON concorrencia FOR ALL USING (true) WITH CHECK (true);

-- Criar bucket para fotos no Storage
-- (Fazer isso manualmente no painel do Supabase: Storage > New Bucket > "produto-fotos" > público)
