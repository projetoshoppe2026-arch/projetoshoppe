import { useState, useEffect, useCallback } from "react";

const SUPABASE_CONFIG_KEY = "shopee_supabase_config";

function createClient(url, key) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const base = url.replace(/\/$/, "");
  return {
    async select(table, params = "") {
      const r = await fetch(`${base}/rest/v1/${table}?${params}`, { headers });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async insert(table, data) {
      const r = await fetch(`${base}/rest/v1/${table}`, {
        method: "POST", headers, body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async update(table, id, data) {
      const r = await fetch(`${base}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH", headers, body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async remove(table, id) {
      const r = await fetch(`${base}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE", headers,
      });
      if (!r.ok) throw new Error(await r.text());
    },
  };
}

const STATUS_MAP = {
  pendente: { label: "Pendente", color: "#EF9F27", bg: "#FAEEDA" },
  pronto: { label: "Pronto", color: "#1D9E75", bg: "#E1F5EE" },
  publicado: { label: "Publicado", color: "#378ADD", bg: "#E6F1FB" },
  pausado: { label: "Pausado", color: "#888780", bg: "#F1EFE8" },
};

const CATEGORIAS = [
  "Luvas Descartáveis", "Carregadores e Acessórios", "Beleza e Cuidado",
  "Travesseiros", "Perfumes", "Projetores", "Brinquedos RC",
  "Eletrônicos", "Bebê e Infantil", "Ferramentas", "Outro"
];

const emptyProduct = {
  sku: "", nome: "", marca: "", categoria: "", custo: "",
  preco_ml: "", preco_shopee: "", estoque: "", peso_kg: "",
  dimensoes: "", ean_gtin: "", fornecedor: "", prazo_reposicao: 7,
  status: "pendente", lote: 1, notas: "", foto_url: "",
};

function calcPrecoShopee(custo, margem = 0.20) {
  if (!custo || custo <= 0) return 0;
  const divisor = 1 - 0.20 - 0.05 - 0.06 - margem;
  return divisor > 0 ? (custo / divisor).toFixed(2) : 0;
}

function calcMargem(custo, preco) {
  if (!custo || !preco || preco <= 0) return 0;
  const taxas = preco * 0.20 + 4 + preco * 0.05 + preco * 0.06;
  const lucro = preco - custo - taxas;
  return ((lucro / preco) * 100).toFixed(1);
}

function ConfigPanel({ onConnect }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const client = createClient(url, key);
      await client.select("produtos", "limit=1");
      onConnect(url, key);
    } catch (e) {
      setError("Erro ao conectar. Verifique URL e chave anon. Detalhes: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 480, width: "100%", background: "var(--color-background-secondary)", borderRadius: 16, padding: 32, border: "1px solid var(--color-border-tertiary)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Shopee Manager</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 6 }}>Conecte seu Supabase para começar</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Supabase URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxx.supabase.co"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Anon Key</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..." type="password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>
            Supabase → Settings → API → Project URL e anon public key
          </p>
          {error && <p style={{ fontSize: 12, color: "var(--color-text-danger)", margin: 0, padding: "8px 12px", background: "var(--color-background-danger)", borderRadius: 8 }}>{error}</p>}
          <button onClick={handleConnect} disabled={!url || !key || loading}
            style={{ padding: "12px", borderRadius: 8, border: "none", background: loading ? "var(--color-border-secondary)" : "#1D9E75", color: "#fff", fontSize: 14, fontWeight: 500, cursor: loading ? "wait" : "pointer", marginTop: 4 }}>
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductForm({ product, onSave, onCancel, loading }) {
  const [form, setForm] = useState(product || emptyProduct);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => { setForm(product || emptyProduct); }, [product]);

  const precoSugerido = calcPrecoShopee(parseFloat(form.custo) || 0);
  const margemAtual = calcMargem(parseFloat(form.custo) || 0, parseFloat(form.preco_shopee) || parseFloat(precoSugerido) || 0);

  const inputStyle = {
    width: "100%", padding: "9px 11px", borderRadius: 8,
    border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", fontSize: 13, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 };
  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 24, border: "1px solid var(--color-border-tertiary)" }}>
      <h2 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 18px", color: "var(--color-text-primary)" }}>
        {product?.id ? "Editar produto" : "Cadastrar produto"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>SKU *</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Ex: LattafaAsad" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nome do produto *</label>
            <input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome completo" style={inputStyle} />
          </div>
        </div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Marca</label>
            <input value={form.marca} onChange={e => set("marca", e.target.value)} placeholder="Ex: Lattafa, Duoflex" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.categoria} onChange={e => set("categoria", e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}>
              <option value="">Selecione</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div>
            <label style={labelStyle}>Custo (R$) *</label>
            <input type="number" step="0.01" value={form.custo} onChange={e => set("custo", e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Preço ML (R$)</label>
            <input type="number" step="0.01" value={form.preco_ml} onChange={e => set("preco_ml", e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Preço Shopee (R$)</label>
            <input type="number" step="0.01" value={form.preco_shopee} onChange={e => set("preco_shopee", e.target.value)}
              placeholder={precoSugerido > 0 ? `Sugerido: ${precoSugerido}` : "0.00"} style={inputStyle} />
          </div>
        </div>

        {parseFloat(form.custo) > 0 && (
          <div style={{ display: "flex", gap: 12, padding: "10px 14px", background: parseFloat(margemAtual) >= 15 ? "#E1F5EE" : parseFloat(margemAtual) >= 5 ? "#FAEEDA" : "#FCEBEB", borderRadius: 8, fontSize: 12 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>Preço sugerido (20% margem): <strong style={{ color: "var(--color-text-primary)" }}>R$ {precoSugerido}</strong></span>
            <span style={{ color: "var(--color-text-secondary)" }}>Margem atual: <strong style={{ color: parseFloat(margemAtual) >= 15 ? "#0F6E56" : parseFloat(margemAtual) >= 5 ? "#854F0B" : "#A32D2D" }}>{margemAtual}%</strong></span>
          </div>
        )}

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Estoque</label>
            <input type="number" value={form.estoque} onChange={e => set("estoque", e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Peso (kg)</label>
            <input type="number" step="0.001" value={form.peso_kg} onChange={e => set("peso_kg", e.target.value)} placeholder="0.000" style={inputStyle} />
          </div>
        </div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>EAN/GTIN</label>
            <input value={form.ean_gtin} onChange={e => set("ean_gtin", e.target.value)} placeholder="Código de barras" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} placeholder="Nome do fornecedor" style={inputStyle} />
          </div>
        </div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Lote</label>
            <select value={form.lote} onChange={e => set("lote", parseInt(e.target.value))} style={{ ...inputStyle, appearance: "auto" }}>
              <option value={1}>Lote 1 — Prioridade alta</option>
              <option value={2}>Lote 2 — Prioridade média</option>
              <option value={3}>Lote 3 — Avaliar</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>URL da foto</label>
          <input value={form.foto_url} onChange={e => set("foto_url", e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Notas</label>
          <textarea value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Observações sobre o produto..."
            rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onCancel}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={!form.sku || !form.nome || loading}
            style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: !form.sku || !form.nome ? "var(--color-border-secondary)" : "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 500, cursor: !form.sku || !form.nome ? "not-allowed" : "pointer" }}>
            {loading ? "Salvando..." : product?.id ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  const st = STATUS_MAP[product.status] || STATUS_MAP.pendente;
  const margem = calcMargem(parseFloat(product.custo) || 0, parseFloat(product.preco_shopee) || 0);

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-tertiary)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Lote {product.lote}</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.nome}</p>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0, fontFamily: "var(--font-mono)" }}>{product.sku}</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onEdit(product)} title="Editar"
            style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
            <i className="ti ti-edit" aria-hidden="true"></i>
          </button>
          <button onClick={() => onDelete(product.id)} title="Excluir"
            style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-danger)", fontSize: 14 }}>
            <i className="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={{ background: "var(--color-background-tertiary)", borderRadius: 6, padding: "6px 10px" }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: 0 }}>Custo</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>R$ {parseFloat(product.custo || 0).toFixed(2)}</p>
        </div>
        <div style={{ background: "var(--color-background-tertiary)", borderRadius: 6, padding: "6px 10px" }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: 0 }}>Shopee</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>R$ {parseFloat(product.preco_shopee || 0).toFixed(2)}</p>
        </div>
        <div style={{ background: "var(--color-background-tertiary)", borderRadius: 6, padding: "6px 10px" }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: 0 }}>Margem</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: parseFloat(margem) >= 15 ? "#0F6E56" : parseFloat(margem) >= 5 ? "#854F0B" : "#A32D2D", margin: 0 }}>{margem}%</p>
        </div>
      </div>
      {product.categoria && (
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {product.categoria}{product.marca ? ` · ${product.marca}` : ""}{product.estoque ? ` · ${product.estoque} un` : ""}
        </span>
      )}
    </div>
  );
}

function StatsBar({ produtos }) {
  const total = produtos.length;
  const publicados = produtos.filter(p => p.status === "publicado").length;
  const prontos = produtos.filter(p => p.status === "pronto").length;
  const pendentes = produtos.filter(p => p.status === "pendente").length;

  const stats = [
    { label: "Total", value: total, color: "var(--color-text-primary)" },
    { label: "Publicados", value: publicados, color: "#378ADD" },
    { label: "Prontos", value: prontos, color: "#1D9E75" },
    { label: "Pendentes", value: pendentes, color: "#EF9F27" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--color-border-tertiary)", textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 500, color: s.color, margin: 0 }}>{s.value}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [client, setClient] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [view, setView] = useState("list");
  const [editProduct, setEditProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleConnect = (url, key) => {
    const c = createClient(url, key);
    setClient(c);
    setConfig({ url, key });
  };

  const loadProducts = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await client.select("produtos", "order=created_at.desc");
      setProdutos(data);
    } catch (e) {
      showMsg("Erro ao carregar: " + e.message, "error");
    }
    setLoading(false);
  }, [client]);

  useEffect(() => { if (client) loadProducts(); }, [client, loadProducts]);

  const handleSave = async (form) => {
    setLoading(true);
    try {
      const data = {
        ...form,
        custo: parseFloat(form.custo) || 0,
        preco_ml: parseFloat(form.preco_ml) || 0,
        preco_shopee: parseFloat(form.preco_shopee) || 0,
        estoque: parseInt(form.estoque) || 0,
        peso_kg: parseFloat(form.peso_kg) || 0,
        prazo_reposicao: parseInt(form.prazo_reposicao) || 7,
        lote: parseInt(form.lote) || 1,
        margem_shopee: parseFloat(calcMargem(parseFloat(form.custo) || 0, parseFloat(form.preco_shopee) || 0)) || 0,
      };
      delete data.id;
      delete data.created_at;
      delete data.updated_at;

      if (editProduct?.id) {
        await client.update("produtos", editProduct.id, data);
        showMsg("Produto atualizado!");
      } else {
        await client.insert("produtos", data);
        showMsg("Produto cadastrado!");
      }
      setView("list");
      setEditProduct(null);
      await loadProducts();
    } catch (e) {
      showMsg("Erro: " + e.message, "error");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este produto?")) return;
    try {
      await client.remove("produtos", id);
      showMsg("Produto excluído!");
      await loadProducts();
    } catch (e) {
      showMsg("Erro: " + e.message, "error");
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setView("form");
  };

  if (!config) return <ConfigPanel onConnect={handleConnect} />;

  const filtered = produtos.filter(p => {
    const matchFilter = filter === "todos" || p.status === filter || (filter === "lote1" && p.lote === 1) || (filter === "lote2" && p.lote === 2) || (filter === "lote3" && p.lote === 3);
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filterBtnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 6, border: "1px solid var(--color-border-tertiary)",
    background: active ? "var(--color-text-primary)" : "var(--color-background-primary)",
    color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)",
    fontSize: 12, cursor: "pointer", fontWeight: active ? 500 : 400, whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "16px 0", maxWidth: 800, margin: "0 auto" }}>
      {msg && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#FCEBEB" : "#E1F5EE",
          color: msg.type === "error" ? "#A32D2D" : "#0F6E56",
          border: `1px solid ${msg.type === "error" ? "#F09595" : "#5DCAA5"}`,
        }}>{msg.text}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Shopee Manager</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>Gestão de produtos e precificação</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setConfig(null); setClient(null); setProdutos([]); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer" }}>
            <i className="ti ti-settings" aria-hidden="true" style={{ marginRight: 4 }}></i>Config
          </button>
          <button onClick={() => { setView("form"); setEditProduct(null); }}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: 4 }}></i>Novo produto
          </button>
        </div>
      </div>

      {view === "form" ? (
        <ProductForm product={editProduct} onSave={handleSave} onCancel={() => { setView("list"); setEditProduct(null); }} loading={loading} />
      ) : (
        <>
          <StatsBar produtos={produtos} />

          <div style={{ display: "flex", gap: 8, margin: "16px 0", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[
                { k: "todos", l: "Todos" }, { k: "pendente", l: "Pendentes" }, { k: "pronto", l: "Prontos" },
                { k: "publicado", l: "Publicados" }, { k: "lote1", l: "Lote 1" }, { k: "lote2", l: "Lote 2" },
              ].map(f => (
                <button key={f.k} onClick={() => setFilter(f.k)} style={filterBtnStyle(filter === f.k)}>{f.l}</button>
              ))}
            </div>
          </div>

          {loading && produtos.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: 40, fontSize: 14 }}>Carregando...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-tertiary)" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>📦</p>
              <p style={{ fontSize: 14, margin: 0 }}>{produtos.length === 0 ? "Nenhum produto cadastrado ainda" : "Nenhum produto encontrado"}</p>
              {produtos.length === 0 && (
                <button onClick={() => setView("form")}
                  style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, cursor: "pointer" }}>
                  Cadastrar primeiro produto
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
